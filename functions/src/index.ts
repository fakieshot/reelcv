// functions/src/index.ts
import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";
import { onDocumentWritten, onDocumentCreated } from "firebase-functions/v2/firestore";

admin.initializeApp();
const db = admin.firestore();

const pairId = (a: string, b: string) => (a < b ? `${a}_${b}` : `${b}_${a}`);

function cleanText(s?: string) {
  return (s ?? "").toString().slice(0, 500);
}

/**
 * ✅ Callable: Ανοίγει/δημιουργεί thread server-side για me <-> other
 * - Επιστρέφει { threadId, canDM } (canDM = true αν connection.status == accepted)
 * - Κάνει όλα τα writes με admin SDK (δεν ισχύουν client rules εδώ)
 */
export const openOrCreateThread = onCall<{ otherUid: string }>(
  { region: "europe-west1" },
  async (req) => {
    const me = req.auth?.uid;
    const other = req.data?.otherUid;
    if (!me) throw new Error("UNAUTHENTICATED");
    if (!other || typeof other !== "string" || other === me) {
      throw new Error("INVALID_ARGUMENT");
    }

    const tid = pairId(me, other);
    const tRef = db.doc(`threads/${tid}`);
    const cRef = db.doc(`connections/${pairId(me, other)}`);

    const [tSnap, cSnap] = await Promise.all([tRef.get(), cRef.get()]);
    const isAccepted = cSnap.exists && (cSnap.data()?.status === "accepted");

    await db.runTransaction(async (tx) => {
      const now = admin.firestore.FieldValue.serverTimestamp();

      if (!tSnap.exists) {
        tx.set(
          tRef,
          {
            members: [me, other],
            createdAt: now,
            lastMessageAt: now,
            unreadCounts: { [me]: 0, [other]: 0 },
            ...(isAccepted ? { connectionId: cRef.id } : {}),
            reads: { [me]: now },
          },
          { merge: true }
        );
      } else {
        const cur = tSnap.data() || {};
        const updates: any = {
          lastMessageAt: now,
          [`unreadCounts.${me}`]: 0,
          [`reads.${me}`]: now,
        };
        if (isAccepted && !cur?.connectionId) {
          updates.connectionId = cRef.id;
        }
        tx.set(tRef, updates, { merge: true });
      }
    });

    return { threadId: tid, canDM: isAccepted };
  }
);

/**
 * ✅ Trigger: Όταν μια σύνδεση γίνει 'accepted',
 * δημιουργεί/συγχρονίζει το αντίστοιχο thread.
 */
export const ensureThreadOnConnectionAccept = onDocumentWritten(
  { region: "europe-west1", document: "connections/{pair}" },
  async (event) => {
    const before = event.data?.before.data() as any | undefined;
    const after = event.data?.after.data() as any | undefined;

    const was = before?.status;
    const now = after?.status;
    if (now !== "accepted" || was === "accepted") return;

    const members: string[] = after?.members ?? [];
    if (!Array.isArray(members) || members.length !== 2) return;

    const [a, b] = members;
    const tid = pairId(a, b);
    const tRef = db.doc(`threads/${tid}`);

    const tSnap = await tRef.get();
    const nowTs = admin.firestore.FieldValue.serverTimestamp();

    if (!tSnap.exists) {
      await tRef.set(
        {
          members: [a, b],
          createdAt: nowTs,
          lastMessageAt: nowTs,
          connectionId: event.params.pair,
          unreadCounts: { [a]: 0, [b]: 0 },
        },
        { merge: true }
      );
    } else {
      const cur = tSnap.data() || {};
      const updates: any = {};
      if (!cur?.connectionId) updates.connectionId = event.params.pair;
      await tRef.set(updates, { merge: true });
    }
  }
);

/** Γράφει ειδοποίηση στον παραλήπτη όταν δημιουργείται request */
export const notifOnNetworkRequestCreate = onDocumentCreated(
  { region: "europe-west1", document: "network_requests/{reqId}" },
  async (event) => {
    const d = event.data?.data() as any;
    if (!d?.fromUid || !d?.toUid) return;
    const cid = pairId(d.fromUid, d.toUid);

    // ➜ Φέρε όνομα & avatar του αποστολέα (fromUid)
    const profSnap = await db.doc(`users/${d.fromUid}/profile/main`).get();
    let fromName: string | null = null;
    let fromAvatar: string | null = null;
    if (profSnap.exists) {
      const pd = profSnap.data() as any;
      fromName = pd.fullName || null;
      fromAvatar = pd.photoURL || pd.avatarUrl || pd.picture || null;
    }

    // upsert connections: pending (+ ονομα/φωτο αποστολέα για το bell)
    await db.doc(`connections/${cid}`).set(
      {
        members: [d.fromUid, d.toUid],
        requestedBy: d.fromUid,
        requestedTo: d.toUid,
        requestedByName: fromName,
        requestedByPhoto: fromAvatar,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // notification στον toUid με fromName
    await db.collection(`users/${d.toUid}/notifications`).add({
      type: "connection_request",
      fromUid: d.fromUid,
      fromName,
      connectionId: cid,
      requestId: event.params.reqId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);

/** Όταν αλλάζει το status του request -> ενημέρωσε connection + notifications */
export const notifOnNetworkRequestUpdate = onDocumentWritten(
  { region: "europe-west1", document: "network_requests/{reqId}" },
  async (event) => {
    const before = event.data?.before.data() as any | undefined;
    const after = event.data?.after.data() as any | undefined;
    if (!after) return;
    if (before?.status === after.status) return;

    const { fromUid, toUid, status } = after;
    if (!fromUid || !toUid) return;
    const cid = pairId(fromUid, toUid);

    await db.doc(`connections/${cid}`).set(
      {
        members: [fromUid, toUid],
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // ➜ όνομα του toUid για ανθρώπινο notification (byName)
    let byName: string | null = null;
    const toProf = await db.doc(`users/${toUid}/profile/main`).get();
    if (toProf.exists) byName = (toProf.data() as any)?.fullName || null;

    if (status === "accepted") {
      await db.collection(`users/${fromUid}/notifications`).add({
        type: "connection_accepted",
        by: toUid,
        byName,
        connectionId: cid,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (status === "declined" || status === "canceled") {
      await db.collection(`users/${fromUid}/notifications`).add({
        type: `connection_${status}`,
        by: toUid,
        byName,
        connectionId: cid,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);

/** Αν αλλάζεις connections απευθείας (από το Bell) -> γράψε notifications με byName */
export const notifOnConnectionStatusChange = onDocumentWritten(
  { region: "europe-west1", document: "connections/{cid}" },
  async (event) => {
    const before = event.data?.before.data() as any | undefined;
    const after = event.data?.after.data() as any | undefined;
    if (!after) return;
    if (before?.status === after.status) return;

    const { status, requestedBy, requestedTo } = after;
    if (!requestedBy || !requestedTo) return;

    // ➜ όνομα requestedTo για να φαίνεται άνθρωπος στο inbox του requestedBy
    let byName: string | null = null;
    const toProf = await db.doc(`users/${requestedTo}/profile/main`).get();
    if (toProf.exists) byName = (toProf.data() as any)?.fullName || null;

    if (status === "accepted") {
      await db.collection(`users/${requestedBy}/notifications`).add({
        type: "connection_accepted",
        by: requestedTo,
        byName,
        connectionId: event.params.cid,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (status === "declined") {
      await db.collection(`users/${requestedBy}/notifications`).add({
        type: "connection_declined",
        by: requestedTo,
        byName,
        connectionId: event.params.cid,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);

/**
 * ✅ Υπάρχον meta-sync στο νέο μήνυμα (κρατάμε όπως το είχες)
 */
export const syncThreadOnMessageCreate = onDocumentCreated(
  { region: "europe-west1", document: "threads/{threadId}/messages/{msgId}" },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const msg = snap.data() as {
      text?: string;
      sender: string;
      createdAt?: admin.firestore.Timestamp;
    };

    const threadId = event.params.threadId as string;
    const threadRef = db.doc(`threads/${threadId}`);

    await db.runTransaction(async (tx) => {
      const tSnap = await tx.get(threadRef);
      if (!tSnap.exists) return;

      const t = tSnap.data() as any;
      const members: string[] = Array.isArray(t?.members) ? t.members : [];
      const sender = msg.sender;
      if (!sender || members.length !== 2 || !members.includes(sender)) return;

      const other = members.find((u) => u !== sender)!;

      const lastText = cleanText(msg.text);
      const lastAt = msg.createdAt ?? admin.firestore.FieldValue.serverTimestamp();
      const connId = t?.connectionId ?? pairId(members[0], members[1]);

      tx.set(
        threadRef,
        {
          lastMessage: lastText,
          lastMessageAt: lastAt,
          lastSender: sender,
          lastMessageUser: sender,
          [`reads.${sender}`]: admin.firestore.FieldValue.serverTimestamp(),
          [`unreadCounts.${sender}`]: 0,
          [`unreadCounts.${other}`]: admin.firestore.FieldValue.increment(1),
          connectionId: connId,
        },
        { merge: true }
      );
    });
  }
);
