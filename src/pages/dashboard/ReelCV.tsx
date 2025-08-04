import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, 
  Mic, 
  Plus, 
  X, 
  Save, 
  Eye,
  Upload,
  Play,
  Linkedin,
  Github,
  Globe,
} from 'lucide-react';

const ReelCV = () => {
  const [skills, setSkills] = useState(['React', 'TypeScript', 'Node.js']);
  const [newSkill, setNewSkill] = useState('');
  const [experiences, setExperiences] = useState([
    {
      id: 1,
      title: 'Senior Frontend Developer',
      company: 'TechCorp Inc.',
      duration: '2021 - Present',
      description: 'Led development of modern web applications using React and TypeScript.',
    }
  ]);

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My ReelCV</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your video CV profile
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button className="gradient-primary">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="video">Video CV</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="social">Social Links</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Tell employers about yourself and what you're looking for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" defaultValue="John Doe" />
                </div>
                <div>
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input id="jobTitle" defaultValue="Senior Frontend Developer" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea 
                  id="bio" 
                  rows={4}
                  defaultValue="Passionate frontend developer with 5+ years of experience building modern web applications. I love creating intuitive user experiences and working with cutting-edge technologies."
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" defaultValue="San Francisco, CA" />
              </div>

              <div>
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center space-x-1">
                      <span>{skill}</span>
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add a skill"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                  />
                  <Button onClick={addSkill} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video CV Tab */}
        <TabsContent value="video" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Video className="w-5 h-5 text-primary" />
                  <span>Video CV</span>
                </CardTitle>
                <CardDescription>
                  Upload your main video CV (2-3 minutes recommended)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <div className="mx-auto w-16 h-16 gradient-primary rounded-full flex items-center justify-center mb-4">
                    <Video className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Current Video CV</h3>
                  <p className="text-muted-foreground mb-4">
                    john-doe-cv.mp4 • 2.3 MB • 2:15 duration
                  </p>
                  <div className="flex justify-center space-x-3">
                    <Button variant="outline" size="sm">
                      <Play className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Replace
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mic className="w-5 h-5 text-accent" />
                  <span>Voice Introduction</span>
                </CardTitle>
                <CardDescription>
                  Add a voice introduction to personalize your profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <div className="mx-auto w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Voice Introduction</h3>
                  <p className="text-muted-foreground mb-4">
                    Add a 30-60 second voice introduction to make your profile more personal
                  </p>
                  <Button variant="outline">
                    <Mic className="w-4 h-4 mr-2" />
                    Record Introduction
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Video Tips */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Video CV Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">📹 Recording Quality</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Use good lighting (face the light source)</li>
                    <li>• Ensure clear audio quality</li>
                    <li>• Keep the background clean and professional</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">💬 Content Guidelines</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Keep it between 1-3 minutes</li>
                    <li>• Introduce yourself and your passion</li>
                    <li>• Highlight key skills and experiences</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experience Tab */}
        <TabsContent value="experience" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Work Experience</CardTitle>
                <CardDescription>
                  Add your professional experience and achievements
                </CardDescription>
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Experience
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {experiences.map((exp, index) => (
                <div key={exp.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{exp.title}</h3>
                      <p className="text-primary">{exp.company}</p>
                      <p className="text-sm text-muted-foreground">{exp.duration}</p>
                      <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {index < experiences.length - 1 && <Separator className="mt-6" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Links Tab */}
        <TabsContent value="social" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Social & Professional Links</CardTitle>
              <CardDescription>
                Add links to your professional profiles and portfolio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Linkedin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <Label>LinkedIn Profile</Label>
                    <Input placeholder="https://linkedin.com/in/johndoe" />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                    <Github className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <Label>GitHub Profile</Label>
                    <Input placeholder="https://github.com/johndoe" />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <Label>Portfolio Website</Label>
                    <Input placeholder="https://johndoe.dev" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReelCV;