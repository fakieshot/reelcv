import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Edit, Search, MessageCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const HowItWorks = () => {
  const candidateSteps = [
    {
      icon: Upload,
      title: 'Upload Video CV',
      description: 'Create a compelling video profile showcasing your personality and skills.',
    },
    {
      icon: Edit,
      title: 'Complete Profile',
      description: 'Add your experience, skills, and professional information.',
    },
    {
      icon: Search,
      title: 'Apply to Jobs',
      description: 'Browse opportunities and apply with your video CV.',
    },
    {
      icon: MessageCircle,
      title: 'Connect',
      description: 'Engage directly with employers through our messaging platform.',
    },
  ];

  const employerSteps = [
    {
      icon: Edit,
      title: 'Post Job',
      description: 'Create detailed job listings with requirements and company info.',
    },
    {
      icon: Search,
      title: 'Review Profiles',
      description: 'Watch video CVs and filter candidates by skills and experience.',
    },
    {
      icon: MessageCircle,
      title: 'Interview',
      description: 'Connect with top candidates and schedule interviews.',
    },
    {
      icon: Upload,
      title: 'Hire',
      description: 'Make offers and onboard your new team members.',
    },
  ];

  return (
    <section id="how-it-works" className="py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How ReelCV Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Simple, effective processes for both candidates and employers to connect authentically.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* For Candidates */}
          <div>
            <div className="text-center mb-12">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                For Candidates
              </div>
              <h3 className="text-2xl font-bold mb-4">Land Your Dream Job</h3>
              <p className="text-muted-foreground">
                Showcase your authentic self and stand out from the crowd.
              </p>
            </div>

            <div className="space-y-6">
              {candidateSteps.map((step, index) => (
                <Card key={index} className="shadow-soft hover:shadow-medium transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                          <step.icon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-primary">Step {index + 1}</span>
                        </div>
                        <h4 className="text-lg font-semibold mb-2">{step.title}</h4>
                        <p className="text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link to="/signup?type=candidate">
                <Button size="lg" className="gradient-primary">
                  Start as Candidate
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* For Employers */}
          <div>
            <div className="text-center mb-12">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
                For Employers
              </div>
              <h3 className="text-2xl font-bold mb-4">Find Perfect Talent</h3>
              <p className="text-muted-foreground">
                Discover candidates beyond their CV and make better hiring decisions.
              </p>
            </div>

            <div className="space-y-6">
              {employerSteps.map((step, index) => (
                <Card key={index} className="shadow-soft hover:shadow-medium transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                          <step.icon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-accent">Step {index + 1}</span>
                        </div>
                        <h4 className="text-lg font-semibold mb-2">{step.title}</h4>
                        <p className="text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link to="/signup?type=employer">
                <Button size="lg" variant="outline" className="border-accent text-accent hover:bg-accent hover:text-white">
                  Start as Employer
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;