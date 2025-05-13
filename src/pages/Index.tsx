
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Video, MessageCircle, Shield, Users, Star, Heart, ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import HeroBackground3D from '../components/HeroBackground3D';

const Index = () => {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <HeroBackground3D />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-6 bg-primary/20 text-primary hover:bg-primary/30 animate-fade-in backdrop-blur-sm">
              <Sparkles className="h-3 w-3 mr-1" /> Connect with new people instantly
            </Badge>
            
            <div className="relative mb-6">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-tight">
                <span className="gradient-text animate-fade-in" style={{animationDelay: '0.1s'}}>Connect</span>{' '}
                <span className="gradient-text animate-fade-in" style={{animationDelay: '0.2s'}}>Randomly.</span>
                <br />
                <span className="gradient-text animate-fade-in" style={{animationDelay: '0.3s'}}>Chat</span>{' '}
                <span className="gradient-text animate-fade-in" style={{animationDelay: '0.4s'}}>Instantly.</span>
              </h1>
              <div className="absolute -right-10 top-0 w-20 h-20 bg-accent/30 rounded-full blur-xl animate-pulse-ring"></div>
              <div className="absolute -left-10 bottom-0 w-20 h-20 bg-primary/30 rounded-full blur-xl animate-pulse-ring"></div>
            </div>
            
            <p className="text-xl md:text-2xl mb-12 text-foreground/80 animate-fade-in font-light" style={{animationDelay: '0.5s'}}>
              Meet new people through random video calls and chat conversations.
              Join thousands of users making meaningful connections every day.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in" style={{animationDelay: '0.6s'}}>
              {currentUser ? (
                <Link to="/dashboard">
                  <Button size="lg" className="px-8 btn-3d bg-gradient-purple">
                    Go to Dashboard
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth">
                    <Button size="lg" className="px-8 btn-3d bg-gradient-purple">
                      Get Started
                      <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/auth?tab=register">
                    <Button size="lg" variant="outline" className="px-8 btn-3d border-primary/30 backdrop-blur-sm">
                      Create Account
                    </Button>
                  </Link>
                </>
              )}
            </div>
            
            <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground animate-fade-in glass-card py-4 px-6 backdrop-blur-md" style={{animationDelay: '0.7s'}}>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-primary" />
                <span>10,000+ Active Users</span>
              </div>
              <div className="flex items-center">
                <Video className="h-4 w-4 mr-2 text-primary" />
                <span>HD Video Quality</span>
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-primary" />
                <span>Secure & Private</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent"></div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-primary">Features</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 gradient-text">How Randomiss Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform makes it easy to connect with new people from around the world
              through high-quality video calls and instant messaging.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Users className="h-6 w-6 text-primary" />,
                title: "Connect",
                description: "Create your account or jump right in. We'll match you with random people from around the world.",
                delay: 0.1
              },
              {
                icon: <Video className="h-6 w-6 text-primary" />,
                title: "Video Chat",
                description: "Start a face-to-face conversation with our high-quality, secure video connection powered by WebRTC.",
                delay: 0.3
              },
              {
                icon: <MessageCircle className="h-6 w-6 text-primary" />,
                title: "Message",
                description: "Prefer typing? Use our text chat feature to communicate with your random match.",
                delay: 0.5
              }
            ].map((feature, index) => (
              <Card key={index} className="glass-card overflow-hidden animate-float" style={{animationDelay: `${index * 0.2}s`}}>
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-glow">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2 gradient-text">{feature.title}</h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-primary">Testimonials</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 gradient-text">What Users Say</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Thousands of users have made meaningful connections on Randomiss.
              Here are some of their stories.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Alex Johnson",
                location: "New York, USA",
                comment: "I've made friends from countries I never thought I'd connect with. The video quality is amazing!",
                rating: 5
              },
              {
                name: "Sarah Williams",
                location: "London, UK",
                comment: "As a language learner, Randomiss has been perfect for practicing with native speakers. Highly recommend!",
                rating: 5
              },
              {
                name: "Miguel Sanchez",
                location: "Madrid, Spain",
                comment: "The interface is so easy to use, and I feel safe with their privacy features. Great experience!",
                rating: 4
              }
            ].map((testimonial, index) => (
              <Card key={index} className="glass-card animate-rotate-3d" style={{animationDelay: `${index * 0.3}s`}}>
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i}
                        className={`h-4 w-4 ${i < testimonial.rating ? "text-primary fill-primary" : "text-muted-foreground"}`} 
                      />
                    ))}
                  </div>
                  <p className="text-lg mb-6 flex-1">"{testimonial.comment}"</p>
                  <div className="mt-auto">
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-center mt-12">
            <Link to={currentUser ? "/dashboard" : "/auth"}>
              <Button className="btn-3d bg-gradient-purple">
                Join Randomiss Today
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Security Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <Badge className="mb-4 bg-purple-100 text-primary">Security</Badge>
              <h2 className="text-3xl font-bold mb-4 gradient-text">Your Security is Our Priority</h2>
              <p className="text-lg text-muted-foreground mb-6">
                At Randomiss, we take your privacy and security seriously. Our platform is built with cutting-edge technology to ensure a safe experience.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start animate-fade-in bg-primary/5 p-3 rounded-lg" style={{animationDelay: '0.1s'}}>
                  <Shield className="h-5 w-5 text-primary mr-2 mt-0.5" />
                  <span>Secure authentication with Firebase</span>
                </li>
                <li className="flex items-start animate-fade-in bg-primary/5 p-3 rounded-lg" style={{animationDelay: '0.2s'}}>
                  <Shield className="h-5 w-5 text-primary mr-2 mt-0.5" />
                  <span>End-to-end encrypted video calls</span>
                </li>
                <li className="flex items-start animate-fade-in bg-primary/5 p-3 rounded-lg" style={{animationDelay: '0.3s'}}>
                  <Shield className="h-5 w-5 text-primary mr-2 mt-0.5" />
                  <span>Simple reporting system for inappropriate content</span>
                </li>
                <li className="flex items-start animate-fade-in bg-primary/5 p-3 rounded-lg" style={{animationDelay: '0.4s'}}>
                  <Shield className="h-5 w-5 text-primary mr-2 mt-0.5" />
                  <span>Advanced user verification processes</span>
                </li>
              </ul>
            </div>
            
            <div className="md:w-1/2 mt-8 md:mt-0">
              <div className="relative animate-float">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-lg blur opacity-30"></div>
                <div className="relative rounded-lg overflow-hidden border border-primary/20 shadow-3d">
                  <img 
                    src="https://images.unsplash.com/photo-1649972904349-6e44c42644a7?auto=format&fit=crop&q=80&w=800" 
                    alt="Secure video chat" 
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-accent/90"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">Ready to Connect?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto text-white">
            Join thousands of users already making random connections on Randomiss. Create your account today and start meeting new people!
          </p>
          <Link to={currentUser ? "/dashboard" : "/auth"}>
            <Button size="lg" variant="secondary" className="px-8 btn-3d">
              {currentUser ? "Go to Dashboard" : "Get Started Now"}
            </Button>
          </Link>
          
          <div className="mt-12 flex flex-wrap justify-center gap-12">
            <div className="text-center text-white glass-card p-6 animate-float" style={{animationDelay: '0.1s'}}>
              <p className="text-4xl font-bold">10,000+</p>
              <p className="opacity-80">Active Users</p>
            </div>
            <div className="text-center text-white glass-card p-6 animate-float" style={{animationDelay: '0.2s'}}>
              <p className="text-4xl font-bold">50,000+</p>
              <p className="opacity-80">Daily Conversations</p>
            </div>
            <div className="text-center text-white glass-card p-6 animate-float" style={{animationDelay: '0.3s'}}>
              <p className="text-4xl font-bold">120+</p>
              <p className="opacity-80">Countries</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-primary/10 py-12 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-primary flex items-center justify-center animate-pulse-ring">
                  <span className="text-primary-foreground font-bold">R</span>
                </div>
                <span className="font-bold text-xl gradient-text">Randomiss</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Connect with the world, one random chat at a time.</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-12">
              <div>
                <h3 className="font-semibold mb-3 gradient-text">Features</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="hover:text-primary transition-colors">Video Chat</li>
                  <li className="hover:text-primary transition-colors">Text Messaging</li>
                  <li className="hover:text-primary transition-colors">User Profiles</li>
                  <li className="hover:text-primary transition-colors">Friend System</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3 gradient-text">Company</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="hover:text-primary transition-colors">About Us</li>
                  <li className="hover:text-primary transition-colors">Privacy Policy</li>
                  <li className="hover:text-primary transition-colors">Terms of Service</li>
                  <li className="hover:text-primary transition-colors">Contact</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3 gradient-text">Connect</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="hover:text-primary transition-colors">Twitter</li>
                  <li className="hover:text-primary transition-colors">Facebook</li>
                  <li className="hover:text-primary transition-colors">Instagram</li>
                  <li className="hover:text-primary transition-colors">Discord</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-primary/10 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">© 2025 Randomiss. Developed by Sukuna.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <Heart className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
              <Star className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
              <Users className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
