import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import confetti from "canvas-confetti";
import { Loader2, Mail, Sparkles, ArrowRight } from "lucide-react";
import { BackgroundParticles } from "@/components/BackgroundParticles";
import { useCreateSubscriber } from "@/hooks/use-subscribers";
import { insertSubscriberSchema } from "@shared/schema";

// Schema for the form
const formSchema = insertSubscriberSchema.extend({
  email: z.string().email("Please enter a valid email address"),
});

type FormData = z.infer<typeof formSchema>;

export default function Landing() {
  const [submitted, setSubmitted] = useState(false);
  const createSubscriber = useCreateSubscriber();
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    reset 
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: FormData) => {
    createSubscriber.mutate(data, {
      onSuccess: () => {
        setSubmitted(true);
        reset();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#06b6d4', '#ffffff']
        });
      }
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10,
      },
    },
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground flex flex-col justify-center items-center p-6 md:p-12">
      {/* Background Effects */}
      <BackgroundParticles />
      
      {/* Abstract Gradients */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      <motion.main
        className="relative z-10 w-full max-w-4xl mx-auto text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo / Brand Pill */}
        <motion.div variants={itemVariants} className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm font-medium text-primary-foreground/90 border-primary/20">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="uppercase tracking-widest text-xs">AI Powered Marketplace</span>
          </div>
        </motion.div>

        {/* Main Title */}
        <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-4 sm:mb-6 px-2">
          <span className="block text-white mb-1 sm:mb-2">INFERA</span>
          <span className="text-gradient">Marketplace AI</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.div variants={itemVariants} className="space-y-3 sm:space-y-4 mb-8 sm:mb-12 px-2">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-light text-muted-foreground flex flex-col md:flex-row items-center justify-center gap-1 sm:gap-2 md:gap-6">
            <span className="tracking-wide">Coming Soon</span>
            <span className="hidden md:block w-2 h-2 rounded-full bg-border" />
            <span className="font-display text-primary font-bold text-2xl sm:text-3xl">قريباً</span>
          </h2>
          <p className="max-w-xl mx-auto text-base sm:text-lg text-muted-foreground/80 leading-relaxed px-4 sm:px-0">
            The future of decentralized AI commerce is being built. 
            Join the waitlist to get early access to the next generation of intelligence.
          </p>
        </motion.div>

        {/* Subscription Form */}
        <motion.div variants={itemVariants} className="max-w-md mx-auto">
          {submitted ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-8 rounded-2xl glass-panel text-center border-green-500/30 bg-green-500/5"
            >
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">You're on the list!</h3>
              <p className="text-muted-foreground">We'll notify you as soon as we launch.</p>
              <button 
                onClick={() => setSubmitted(false)}
                className="mt-6 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Register another email
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-2 sm:px-0">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300" />
                <div className="relative flex flex-col sm:flex-row bg-background/80 backdrop-blur-xl rounded-xl border border-white/10 p-2 shadow-2xl gap-2 sm:gap-0">
                  <div className="flex items-center w-full sm:w-auto">
                    <div className="pl-3 sm:pl-4 flex items-center justify-center text-muted-foreground">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="Enter your email"
                      className="flex-1 bg-transparent border-none text-white placeholder:text-muted-foreground/50 focus:ring-0 focus:outline-none px-3 sm:px-4 py-3 min-w-0 text-base"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={createSubscriber.isPending}
                    className="w-full sm:w-auto px-4 sm:px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {createSubscriber.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Notify Me
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm text-left pl-2 animate-in slide-in-from-top-1 fade-in">
                  {errors.email.message}
                </p>
              )}
              {createSubscriber.isError && (
                <p className="text-red-400 text-sm text-left pl-2 animate-in slide-in-from-top-1 fade-in">
                  {createSubscriber.error?.message}
                </p>
              )}
            </form>
          )}
        </motion.div>
        
        {/* Footer info */}
        <motion.div variants={itemVariants} className="mt-20 pt-8 border-t border-white/5">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground/60 gap-4">
            <p>&copy; {new Date().getFullYear()} INFERA Marketplace. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-primary transition-colors cursor-pointer">Twitter</span>
              <span className="hover:text-primary transition-colors cursor-pointer">Discord</span>
              <span className="hover:text-primary transition-colors cursor-pointer">Contact</span>
            </div>
          </div>
        </motion.div>
      </motion.main>
    </div>
  );
}
