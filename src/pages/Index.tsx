import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { 
  Video, MessageCircle, Shield, Users, Star, Heart, ArrowRight, Sparkles, 
  Globe2, Zap, Lock, CheckCircle, Coffee, Smile, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const Index = () => {
  const { currentUser } = useAuth();

  const features = [
    {
      icon: Video,
      title: "HD Video Chat",
      description: "Crystal clear video calls with high-quality audio for the best conversation experience."
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "End-to-end encryption ensures your conversations remain private and secure."
    },
    {
      icon: Globe2,
      title: "Global Reach",
      description: "Connect with people from over 190 countries and experience diverse cultures."
    },
    {
      icon: Zap,
      title: "Instant Matching",
      description: "Our smart algorithm matches you with like-minded people in seconds."
    }
  ];

  const stats = [
    { number: "10M+", label: "Users Worldwide" },
    { number: "190+", label: "Countries" },
    { number: "1M+", label: "Daily Chats" },
    { number: "4.8", label: "App Rating" }
  ];

  const howItWorks = [
    {
      step: 1,
      title: "Create an Account",
      description: "Sign up in seconds with your email or Google account"
    },
    {
      step: 2,
      title: "Set Up Your Profile",
      description: "Add your interests and preferences to find better matches"
    },
    {
      step: 3,
      title: "Start Chatting",
      description: "Connect instantly with people from around the world"
    }
  ];

  const testimonials = [
    {
      name: "Sarah K.",
      location: "United States",
      comment: "I've made amazing friends from all around the world. The video quality is fantastic!",
      rating: 5,
      avatar: "1"
    },
    {
      name: "James M.",
      location: "United Kingdom",
      comment: "The best platform for meeting new people. Very secure and user-friendly.",
      rating: 5,
      avatar: "2"
    },
    {
      name: "Aisha R.",
      location: "UAE",
      comment: "Love how easy it is to connect with people who share my interests.",
      rating: 5,
      avatar: "3"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background/50 to-background">
      <Navbar />
      
      {/* Animated Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 overflow-hidden">
        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <Badge variant="outline" className="mb-4 py-1 px-4 bg-primary/10 backdrop-blur-sm border-primary/20">
              <Sparkles className="w-3 h-3 mr-2 text-primary animate-pulse" />
              Connect with the World
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
              Where Meaningful
              <br />
              Connections Happen
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              Experience the future of online connections through secure video chats and instant messaging. 
              Meet new people, share experiences, and build lasting friendships.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {currentUser ? (
                <Link to="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto px-8 btn-3d bg-gradient-to-r from-primary to-accent hover:opacity-90">
                    Go to Dashboard
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth">
                    <Button size="lg" className="w-full sm:w-auto px-8 btn-3d bg-gradient-to-r from-primary to-accent hover:opacity-90">
                      Get Started
                      <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/auth?tab=register">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 btn-3d glass-card">
                      Create Account
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Stats Section */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card p-4 rounded-lg"
                >
                  <div className="text-2xl md:text-3xl font-bold text-primary">{stat.number}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-background to-background/50">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Get started in three simple steps
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorks.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <Card className="glass-card group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                    <ChevronRight className="w-6 h-6 text-primary/50" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Why Choose Randomiss?
            </h2>
            <p className="text-lg text-muted-foreground">
              Experience the best features for meeting new people online
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="glass-card group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="mb-4 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-background/50 to-background">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              What Our Users Say
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of satisfied users making connections every day
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="glass-card group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                        {testimonial.avatar}
                      </div>
                      <div className="ml-4">
                        <h4 className="font-semibold">{testimonial.name}</h4>
                        <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-4">{testimonial.comment}</p>
                    <div className="flex items-center">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Ready to Start Your Journey?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join our growing community and start making meaningful connections today.
            </p>
            <Link to={currentUser ? "/dashboard" : "/auth"}>
              <Button size="lg" className="px-8 btn-3d bg-gradient-to-r from-primary to-accent hover:opacity-90">
                {currentUser ? "Go to Dashboard" : "Get Started Now"}
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-4 border-t border-border/40">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-4">Randomiss</h3>
              <p className="text-sm text-muted-foreground">
                Connecting people worldwide through secure video chat and messaging.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Video Chat</li>
                <li>Instant Messaging</li>
                <li>Global Community</li>
                <li>Security</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>About Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Twitter</li>
                <li>Facebook</li>
                <li>Instagram</li>
                <li>LinkedIn</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Randomiss. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
