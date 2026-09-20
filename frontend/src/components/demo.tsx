import React from 'react';
import { ContactSection, SocialLink } from '@/components/ui/contact';

/**
 * Demo component to showcase the ContactSection.
 * This demonstrates how to use the ContactSection component with various props.
 */
const DemoContactSection: React.FC = () => {
  const customSocialLinks: SocialLink[] = [
    { id: '1', name: 'Facebook', iconSrc: 'https://cdn.jsdelivr.net/npm/simple-icons@v5/icons/facebook.svg', href: 'https://facebook.com/yourprofile' },
    { id: '2', name: 'Twitter', href: 'https://twitter.com/yourprofile' },
  ];

  const handleFormSubmit = (data: any) => {
    alert("Demo form submitted! Check console for data.");
    console.log("Demo form data:", data);
    // In a real application, you'd send this data to an API
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-900 dark:to-black">
      {/*
        The ContactSection component is highly customizable via props.
        Here we demonstrate overriding some default values and providing
        a custom submission handler.
      */}
      <ContactSection
        title="Let's build something amazing together!"
        mainMessage="Reach out to us today! ✨"
        contactEmail="info@yourcompany.com"
        socialLinks={customSocialLinks}
        onSubmit={handleFormSubmit}
        // Background image from Unsplash
        backgroundImageSrc="https://images.unsplash.com/photo-1507525428034-b723cf961faf?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3"
      />
    </div>
  );
};

export default DemoContactSection;
