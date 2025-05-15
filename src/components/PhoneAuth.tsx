import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Phone, Shield, Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { setupRecaptcha, startPhoneAuth, verifyPhoneCode } from '../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PhoneAuthProps {
  onSuccess?: () => void;
}

const PhoneAuth: React.FC<PhoneAuthProps> = ({ onSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const { toast } = useToast();
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  const handleSendCode = async () => {
    if (!phoneNumber) {
      toast({
        title: "Validation Error",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      const recaptchaVerifier = setupRecaptcha('recaptcha-container');
      const confirmation = await startPhoneAuth(formattedNumber, recaptchaVerifier);
      setConfirmationResult(confirmation);
      setStep('code');
      toast({
        title: "Code Sent",
        description: "Verification code has been sent to your phone.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      toast({
        title: "Validation Error",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await verifyPhoneCode(confirmationResult, verificationCode);
      toast({
        title: "Success",
        description: "Phone number verified successfully!",
      });
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" />
          Phone Verification
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {step === 'phone' ? (
            <motion.div
              key="phone-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="relative">
                <Input
                  type="tel"
                  placeholder="Enter your phone number (e.g., +1234567890)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
                <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              </div>
              <Button
                onClick={handleSendCode}
                className={cn(
                  "w-full btn-3d bg-gradient-purple",
                  loading && "opacity-50 cursor-not-allowed"
                )}
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white rounded-full animate-spin border-t-transparent" />
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Send Verification Code
                  </>
                )}
              </Button>
              <div id="recaptcha-container" ref={recaptchaContainerRef} />
            </motion.div>
          ) : (
            <motion.div
              key="code-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter verification code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                  maxLength={6}
                />
                <Shield className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleVerifyCode}
                  className={cn(
                    "flex-1 btn-3d bg-gradient-purple",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white rounded-full animate-spin border-t-transparent" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Verify Code
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep('phone')}
                  disabled={loading}
                  className="glass-card"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default PhoneAuth; 