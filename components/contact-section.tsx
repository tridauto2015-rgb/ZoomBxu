"use client"

import { useEffect, useRef, useState } from "react"
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react"
import emailjs from '@emailjs/browser'

const contactInfo = [
  {
    icon: Phone,
    label: "Call Us",
    value: "09507586561",
    desc: "Always Available",
    isPhone: true,
  },

  {
    icon: MessageCircle,
    label: "Message Us",
    value: "09507586561",
    desc: "Chat with us on Viber",
    isMessenger: true,
  },

  {
    icon: MapPin,
    label: "Find Us",
    value: "Google Maps link",
    desc: "Get directions to our store",
  },
]

export function ContactSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Initialize EmailJS
  useEffect(() => {
    emailjs.init("0_b_ca6XhwhVIL_zF")
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const templateParams = {
        name: formData.name,
        phone: formData.phone,
        message: formData.message,
        to_email: 'zoombxusurplus@gmail.com', // Your receiving email
      }

      await emailjs.send(
        'service_75zffy2',
        'template_yq78p5h',
        templateParams
      )

      setSubmitStatus('success')
      setShowSuccessAnimation(true)
      setFormData({ name: '', phone: '', message: '' })
      
      // Hide success animation after 3 seconds
      setTimeout(() => setShowSuccessAnimation(false), 3000)
      // Reset success message after 5 seconds
      setTimeout(() => setSubmitStatus('idle'), 5000)
    } catch (error) {
      console.error('EmailJS error:', error)
      setSubmitStatus('error')
      
      // Reset error message after 5 seconds
      setTimeout(() => setSubmitStatus('idle'), 5000)
    } finally {
      // Delay button reset for animation effect
      setTimeout(() => setIsSubmitting(false), 1000)
    }
  }

  return (
    <section id="contact" ref={sectionRef} className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          {/* Contact info */}
          <div
            className={`transition-all duration-1000 ${
              isVisible
                ? "translate-x-0 opacity-100"
                : "-translate-x-8 opacity-0"
            }`}
          >

            <h2 className="font-russo-one text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
              <span className="text-balance">For more inquiries, <br></br>please contact us</span>
            </h2>
            <p className="mt-4 text-xl leading-relaxed text-muted-foreground">
              Our friendly team of auto parts experts is ready to help you find
              the exact part you need. Just give us a call or send us a message.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {contactInfo.map((item, i) => (
                <div
                  key={item.label}
                  className="animate-fade-in-up flex items-start gap-4 rounded-xl bg-secondary p-6 text-justify"
                  style={{
                    animationDelay: `${300 + i * 120}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-muted-foreground">
                      {item.label}
                    </p>
                    {item.label === "Find Us" ? (
                      <a
                        href="https://maps.google.com/?q=936+Ochoa+Ave+Butuan+City+8600+Agusan+del+Norte+Philippines"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-bold text-primary hover:text-primary/80 transition-colors"
                      >
                        {item.value}
                      </a>
                    ) : item.isPhone ? (
                      <a
                        href={`tel:+63${item.value}`}
                        className="text-lg font-bold text-primary hover:text-primary/80 transition-colors"
                      >
                        {item.value}
                      </a>
                    ) : item.isMessenger ? (
                      <a
                        href={`viber://chat?number=%2B639507586561`}
                        className="text-lg font-bold text-primary hover:text-primary/80 transition-colors"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-lg font-bold text-primary">
                        {item.value}
                      </p>
                    )}
                    <p className="text-base text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact form */}
          <div
            className={`transition-all duration-1000 delay-300 ${
              isVisible
                ? "translate-x-0 opacity-100"
                : "translate-x-8 opacity-0"
            }`}
          >
            {/* Success Animation Overlay */}
            {showSuccessAnimation && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-20"></div>
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-green-500 shadow-2xl">
                    <svg
                      className="h-12 w-12 text-white animate-bounce"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-xl font-bold text-white">Message Sent!</p>
                    <p className="text-sm text-white/80">We'll contact you soon</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-8 shadow-sm lg:p-10 space-y-6 relative overflow-hidden">
              {/* Submitting Overlay */}
              {isSubmitting && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 backdrop-blur-sm">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                      <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-primary opacity-20"></div>
                    </div>
                    <p className="text-lg font-medium text-foreground animate-pulse">Sending message...</p>
                  </div>
                </div>
              )}
              <h3 className="mb-8 font-roboto text-2xl font-bold text-card-foreground">
                Send Us a Message
              </h3>

              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-lg font-semibold text-card-foreground"
                >
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-input bg-background px-5 py-4 text-lg text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-lg font-semibold text-card-foreground"
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Your Number"
                  className="w-full rounded-xl border border-input bg-background px-5 py-4 text-lg text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-lg font-semibold text-card-foreground"
                >
                  Your Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={5}
                  placeholder="Tell us what part you need or how we can help..."
                  className="w-full resize-none rounded-xl border border-input bg-background px-5 py-4 text-lg text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>

              {/* Status Messages */}
              {submitStatus === 'success' && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-green-800">
                  ✅ Message sent successfully! We'll contact you soon.
                </div>
              )}
              
              {submitStatus === 'error' && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-800">
                  ❌ Failed to send message. Please try again or call us directly.
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`
                  w-full rounded-xl bg-primary py-5 text-xl font-bold text-primary-foreground 
                  transition-all duration-300 relative overflow-hidden group
                  ${isSubmitting 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/25 active:scale-[0.98]'
                  }
                `}
              >
                <span className={`relative z-10 ${isSubmitting ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </span>
                
                {/* Button ripple effect */}
                {!isSubmitting && (
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                )}
                
                {/* Button shine effect */}
                <span className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
