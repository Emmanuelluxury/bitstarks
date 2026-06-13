'use client';

import { useState } from 'react';

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How long does a transfer take?',
      answer: 'Transfers typically take between 10-30 minutes depending on network congestion. Bitcoin confirmations usually take the longest, while the StarkNet portion is almost instant.'
    },
    {
      question: 'What are the fees for using the bridge?',
      answer: 'Our bridge charges a 0.1% fee on transfers, plus network gas fees. This is significantly lower than most cross-chain bridges on the market.'
    },
    {
      question: 'Is my funds safe during the bridging process?',
      answer: 'Yes! Our bridge is non-custodial, meaning you maintain control of your assets throughout the entire process. The smart contracts have been audited by leading security firms.'
    },
    {
      question: 'What wallets are supported?',
      answer: 'We support all major Bitcoin wallets (like Ledger, Trezor, Electrum) and StarkNet wallets (Argent X, Braavos). You can see the full list in our documentation.'
    }
  ];

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="faq" id="faq">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">Find answers to common questions about our bridge</p>
        </div>
        <div className="faq-grid">
          {faqs.map((faq, index) => (
            <div key={index} className={`faq-item ${activeIndex === index ? 'active' : ''}`}>
              <div className="faq-question" onClick={() => toggleFAQ(index)}>
                {faq.question}
                <i className="fas fa-chevron-down faq-toggle"></i>
              </div>
              <div className="faq-answer">
                {faq.answer}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}