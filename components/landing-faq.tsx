'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const questions = [
  {
    question: 'What can I put on my pet-sitting website?',
    answer:
      'Your page can include your name or business name, photo, service area, services, contact details, and an availability request form.'
  },
  {
    question: 'Do I need to know how to design a website?',
    answer:
      'No. The builder asks for your business details one step at a time and turns them into a finished page.'
  },
  {
    question: 'How do pet owners contact me?',
    answer:
      'They send an availability request from your page. You receive their dates, service request, pet details, and message in your dashboard.'
  },
  {
    question: 'Does Sitterfolio confirm bookings for me?',
    answer:
      'No. You decide whether you are available and confirm care directly with the pet owner. Sitterfolio keeps the request and conversation organized.'
  }
];

export function LandingFaq() {
  const [openQuestion, setOpenQuestion] = useState(0);

  return (
    <div className="divide-y border-y landing-rule">
      {questions.map(({ question, answer }, index) => {
        const isOpen = openQuestion === index;
        const answerId = `faq-answer-${index}`;

        return (
          <article key={question} className="landing-faq-item">
            <h3>
              <button
                type="button"
                className="landing-faq-trigger"
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => setOpenQuestion(isOpen ? -1 : index)}
              >
                <span>{question}</span>
                <span className="landing-faq-icon" aria-hidden="true">
                  <ChevronDown className="size-4" strokeWidth={2} />
                </span>
              </button>
            </h3>
            <div id={answerId} className="landing-faq-answer" data-open={isOpen}>
              <div>
                <p className="max-w-2xl pb-7 pr-12 leading-7 landing-muted">{answer}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
