export default function Testimonials() {
  const testimonials = [
    {
      text: '"The Bitcoin-StarkNet bridge has revolutionized how I interact with DeFi. The process is seamless and the fees are significantly lower than other solutions."',
      author: 'Emmanuel Okanandu',
      role: 'DeFi Enthusiast',
      initials: 'EO'
    },
    {
      text: '"As a developer, I appreciate the robust API and documentation. Integrating the bridge into our dApp was straightforward and our users love the experience."',
      author: 'Nzube Emmanuel',
      role: 'Blockchain Developer',
      initials: 'NE'
    },
    {
      text: '"The security features give me peace of mind when moving large amounts. The non-custodial approach means I always maintain control of my assets."',
      author: 'Black Ghost',
      role: 'Crypto Investor',
      initials: 'BG'
    }
  ];

  return (
    <section className="testimonials" id="testimonials">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">What Our Users Say</h2>
          <p className="section-subtitle">Trusted by thousands of users across the globe</p>
        </div>
        <div className="testimonial-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <p className="testimonial-text">{testimonial.text}</p>
              <div className="testimonial-author">
                <div className="author-avatar">{testimonial.initials}</div>
                <div className="author-info">
                  <h4>{testimonial.author}</h4>
                  <p>{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}