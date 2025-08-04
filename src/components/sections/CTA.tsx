import { Button } from '@/components/ui/button';
import { ArrowRight, Users, Building } from 'lucide-react';
import { Link } from 'react-router-dom';

const CTA = () => {
  return (
    <section className="py-24 gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/10" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Hiring?
          </h2>
          <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join the revolution in recruitment. Whether you're looking for talent or seeking opportunities, 
            ReelCV connects you with authentic, meaningful matches.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link to="/signup?type=candidate">
              <Button 
                size="lg" 
                variant="secondary"
                className="text-lg px-8 py-4 transition-bounce hover:scale-105"
              >
                <Users className="w-5 h-5 mr-2" />
                Create Your ReelCV
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            
            <Link to="/signup?type=employer">
              <Button 
                size="lg"
                variant="outline"
                className="text-lg px-8 py-4 bg-white/10 border-white/20 text-white hover:bg-white hover:text-primary transition-bounce hover:scale-105"
              >
                <Building className="w-5 h-5 mr-2" />
                Start Hiring
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>

          <p className="text-white/70 mt-8 text-sm">
            Free to get started • No credit card required • Join 1000+ users
          </p>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
      <div className="absolute bottom-10 right-10 w-24 h-24 bg-white/10 rounded-full blur-xl" />
    </section>
  );
};

export default CTA;