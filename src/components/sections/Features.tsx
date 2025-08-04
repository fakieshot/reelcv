import { Card, CardContent } from '@/components/ui/card';
import { Video, Mic, Users, Filter, MessageCircle, BarChart3 } from 'lucide-react';
import videoIcon from '@/assets/video-icon.png';
import voiceIcon from '@/assets/voice-icon.png';
import networkIcon from '@/assets/network-icon.png';

const Features = () => {
  const features = [
    {
      icon: Video,
      image: videoIcon,
      title: 'Video CVs',
      description: 'Showcase personality and skills through engaging video profiles that go beyond traditional resumes.',
    },
    {
      icon: Mic,
      image: voiceIcon,
      title: 'Voice Introductions',
      description: 'Add personal voice messages to make authentic connections with potential employers.',
    },
    {
      icon: Users,
      image: networkIcon,
      title: 'Smart Matching',
      description: 'AI-powered matching system connects the right talent with the right opportunities.',
    },
    {
      icon: Filter,
      title: 'Advanced Filters',
      description: 'Filter candidates by skills, experience, location, and more for precise hiring.',
    },
    {
      icon: MessageCircle,
      title: 'Direct Communication',
      description: 'Built-in messaging system for seamless candidate-employer communication.',
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Track application performance and hiring metrics with detailed analytics.',
    },
  ];

  return (
    <section id="features" className="py-24 bg-muted/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powerful Features for Modern Hiring
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to revolutionize your recruitment process and connect with talent authentically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="shadow-soft hover:shadow-medium transition-smooth group hover:-translate-y-1 gradient-card border-0"
            >
              <CardContent className="p-8 text-center">
                <div className="mb-6 flex justify-center">
                  {feature.image ? (
                    <img 
                      src={feature.image} 
                      alt={feature.title}
                      className="w-16 h-16 object-contain"
                    />
                  ) : (
                    <div className="w-16 h-16 gradient-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-bounce">
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-4 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;