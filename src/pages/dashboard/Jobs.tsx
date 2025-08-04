import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  MapPin, 
  Clock, 
  Building, 
  Heart,
  ExternalLink,
  Filter,
  Calendar,
  Eye,
} from 'lucide-react';

const Jobs = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const jobListings = [
    {
      id: 1,
      title: 'Senior Frontend Developer',
      company: 'TechCorp Inc.',
      location: 'San Francisco, CA',
      type: 'Full-time',
      salary: '$120k - $160k',
      postedDate: '2 days ago',
      skills: ['React', 'TypeScript', 'Next.js'],
      description: 'We are looking for a passionate Senior Frontend Developer to join our growing team...',
      logo: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=100&h=100&fit=crop',
      applied: false,
    },
    {
      id: 2,
      title: 'Full Stack Engineer',
      company: 'StartupXYZ',
      location: 'Remote',
      type: 'Full-time',
      salary: '$100k - $140k',
      postedDate: '1 week ago',
      skills: ['Node.js', 'React', 'PostgreSQL'],
      description: 'Join our mission to revolutionize the industry with cutting-edge technology...',
      logo: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=100&h=100&fit=crop',
      applied: true,
    },
    {
      id: 3,
      title: 'UI/UX Designer',
      company: 'Creative Studio',
      location: 'New York, NY',
      type: 'Contract',
      salary: '$80k - $100k',
      postedDate: '3 days ago',
      skills: ['Figma', 'Design Systems', 'Prototyping'],
      description: 'Create beautiful and intuitive user experiences for our digital products...',
      logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
      applied: false,
    },
  ];

  const myApplications = [
    {
      id: 1,
      title: 'Senior Frontend Developer',
      company: 'TechCorp Inc.',
      appliedDate: '2024-01-15',
      status: 'under_review',
      lastUpdate: '2 days ago',
    },
    {
      id: 2,
      title: 'Full Stack Engineer',
      company: 'StartupXYZ',
      appliedDate: '2024-01-10',
      status: 'interview',
      lastUpdate: '1 week ago',
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Job Opportunities</h1>
        <p className="text-muted-foreground mt-2">
          Discover amazing opportunities and track your applications
        </p>
      </div>

      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList>
          <TabsTrigger value="browse">Browse Jobs</TabsTrigger>
          <TabsTrigger value="applications">My Applications ({myApplications.length})</TabsTrigger>
        </TabsList>

        {/* Browse Jobs Tab */}
        <TabsContent value="browse" className="space-y-6">
          {/* Search and Filters */}
          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search jobs, companies, or skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Job Listings */}
          <div className="space-y-6">
            {jobListings.map((job) => (
              <Card key={job.id} className="shadow-soft hover:shadow-medium transition-smooth">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <img
                        src={job.logo}
                        alt={job.company}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-1">
                          {job.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Building className="w-4 h-4" />
                            <span>{job.company}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{job.location}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{job.postedDate}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="icon">
                        <Heart className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-muted-foreground mb-4">{job.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm">
                      <Badge variant="outline">{job.type}</Badge>
                      <span className="font-medium text-primary">{job.salary}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      {job.applied ? (
                        <Button disabled>Applied</Button>
                      ) : (
                        <Button className="gradient-primary">Apply Now</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* My Applications Tab */}
        <TabsContent value="applications" className="space-y-6">
          <div className="space-y-4">
            {myApplications.map((application) => (
              <Card key={application.id} className="shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {application.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Building className="w-4 h-4" />
                          <span>{application.company}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Applied on {new Date(application.appliedDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Last update: {application.lastUpdate}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className={getStatusColor(application.status)}>
                        {getStatusText(application.status)}
                      </Badge>
                      <Button variant="outline" size="sm">
                        View Application
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {myApplications.length === 0 && (
            <Card className="shadow-soft">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start browsing jobs and apply to positions that match your skills.
                </p>
                <Button className="gradient-primary">Browse Jobs</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Jobs;