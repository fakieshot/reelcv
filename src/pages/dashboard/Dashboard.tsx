import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Video, 
  Briefcase, 
  MessageCircle, 
  TrendingUp, 
  Users, 
  Eye,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  // Mock data - in real app, fetch from API
  const stats = {
    profileViews: 156,
    applications: 12,
    messages: 8,
    profileCompletion: 85,
  };

  const recentApplications = [
    {
      id: 1,
      jobTitle: 'Senior Frontend Developer',
      company: 'TechCorp Inc.',
      appliedAt: '2 days ago',
      status: 'under_review',
    },
    {
      id: 2,
      jobTitle: 'UI/UX Designer',
      company: 'Creative Studio',
      appliedAt: '1 week ago',
      status: 'interview',
    },
    {
      id: 3,
      jobTitle: 'Product Manager',
      company: 'StartupXYZ',
      appliedAt: '2 weeks ago',
      status: 'rejected',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'interview':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'under_review':
        return 'Under Review';
      case 'interview':
        return 'Interview Scheduled';
      case 'rejected':
        return 'Not Selected';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, John!</h1>
        <p className="text-muted-foreground mt-2">
          Here's what's happening with your ReelCV profile and applications.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.profileViews}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.applications}</div>
            <p className="text-xs text-muted-foreground">
              +3 this week
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messages}</div>
            <p className="text-xs text-muted-foreground">
              2 unread
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Strength</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.profileCompletion}%</div>
            <p className="text-xs text-muted-foreground">
              Complete your profile
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Completion */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-primary" />
              <span>Complete Your Profile</span>
            </CardTitle>
            <CardDescription>
              Increase your visibility to employers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Profile Completion</span>
                <span className="text-sm text-muted-foreground">{stats.profileCompletion}%</span>
              </div>
              <Progress value={stats.profileCompletion} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>✅ Basic Info</span>
                <span className="text-muted-foreground">Complete</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>✅ Video CV</span>
                <span className="text-muted-foreground">Complete</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>⏳ Voice Introduction</span>
                <span className="text-muted-foreground">Missing</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>⏳ Work Experience</span>
                <span className="text-muted-foreground">Incomplete</span>
              </div>
            </div>

            <Link to="/dashboard/reelcv">
              <Button className="w-full gradient-primary">
                Complete Profile
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-primary" />
                <span>Recent Applications</span>
              </CardTitle>
              <Link to="/dashboard/jobs">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <CardDescription>
              Track your job application progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentApplications.map((application) => (
                <div key={application.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{application.jobTitle}</h4>
                    <p className="text-sm text-muted-foreground">{application.company}</p>
                    <p className="text-xs text-muted-foreground mt-1">Applied {application.appliedAt}</p>
                  </div>
                  <Badge className={getStatusColor(application.status)}>
                    {getStatusText(application.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to boost your profile and applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/dashboard/upload">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <Video className="w-6 h-6" />
                <span>Upload Video</span>
              </Button>
            </Link>
            <Link to="/dashboard/jobs">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <Briefcase className="w-6 h-6" />
                <span>Browse Jobs</span>
              </Button>
            </Link>
            <Link to="/dashboard/messages">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <MessageCircle className="w-6 h-6" />
                <span>Messages</span>
              </Button>
            </Link>
            <Link to="/dashboard/settings">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <Users className="w-6 h-6" />
                <span>Settings</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;