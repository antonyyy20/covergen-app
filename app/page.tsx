"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { GridPattern } from "@/components/ui/grid-pattern"
import { MagicCard } from "@/components/ui/magic-card"
import { Meteors } from "@/components/ui/meteors"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ImageCarouselHero } from "@/components/ui/ai-image-generator-hero"
import { 
  Sparkles, 
  ArrowRight
} from "lucide-react"

export default function Home() {
  const router = useRouter()
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6" />
            <span className="font-bold text-xl">CoverGen</span>
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <Link href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
              How it works
            </Link>
            <Link href="#faq" className="text-sm font-medium hover:text-primary transition-colors">
              FAQ
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Image Carousel - Compact */}
      <div className="pt-16">
        <ImageCarouselHero
          title="Generate App Store & Play Store covers in minutes"
          subtitle="AI-Powered Cover Generator"
          description="Transform your ideas into breathtaking visuals with cutting-edge AI technology. Professional designs, zero design skills required."
          ctaText="Get started"
          onCtaClick={() => router.push("/register")}
          images={[
            {
              id: "1",
              src: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900",
              alt: "App Store Cover Example",
              rotation: -15,
            },
            {
              id: "2",
              src: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=900",
              alt: "Play Store Cover Example",
              rotation: -8,
            },
            {
              id: "3",
              src: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=900",
              alt: "Mobile App Design",
              rotation: 5,
            },
            {
              id: "4",
              src: "https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=900",
              alt: "App Marketing",
              rotation: 12,
            },
            {
              id: "5",
              src: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=900",
              alt: "UI Design",
              rotation: -12,
            },
            {
              id: "6",
              src: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=900",
              alt: "App Store Graphics",
              rotation: 8,
            },
          ]}
          features={[
            {
              title: "Realistic Results",
              description: "Photos that look professionally crafted",
            },
            {
              title: "Fast Generation",
              description: "Turn ideas into images in seconds.",
            },
            {
              title: "Diverse Styles",
              description: "Choose from a wide range of artistic options.",
            },
          ]}
        />
      </div>

      {/* How it Works */}
      <section id="how-it-works" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How it works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to professional app store covers
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "1",
                title: "Upload Screenshots",
                description: "Add your app screenshots and reference images to guide the AI.",
              },
              {
                step: "2",
                title: "Add References",
                description: "Include brand logos and style references to maintain consistency.",
              },
              {
                step: "3",
                title: "Generate Covers",
                description: "Watch as AI creates stunning covers ready for your app store.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-2xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How does the AI generation work?</AccordionTrigger>
              <AccordionContent>
                Our AI analyzes your app screenshots, brand guidelines, and reference images to create 
                covers that match your app&apos;s style and Apple/Google&apos;s design guidelines.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>What formats do you support?</AccordionTrigger>
              <AccordionContent>
                We support all standard app store cover formats for both iOS App Store and Google Play Store, 
                including various device sizes and aspect ratios.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Can I customize the generated covers?</AccordionTrigger>
              <AccordionContent>
                Yes! You can fine-tune prompts, select different styles, and regenerate variations until 
                you&apos;re happy with the result.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Do you store my app data?</AccordionTrigger>
              <AccordionContent>
                Your data is encrypted and stored securely. You can delete your projects and assets at any time.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to create stunning covers?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of developers creating professional app store covers in minutes.
          </p>
          <Button size="lg" asChild className="text-lg px-8">
            <Link href="/register">
              Get started for free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Sparkles className="h-6 w-6" />
              <span className="font-bold text-xl">CoverGen</span>
            </div>
            <div className="flex space-x-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-primary">Privacy</Link>
              <Link href="#" className="hover:text-primary">Terms</Link>
              <Link href="#" className="hover:text-primary">Contact</Link>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            © 2024 CoverGen. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
