export default function HowItWorks() {
  const steps = [
    {
      number: '1',
      title: 'Connect',
      description: 'Connect your Bitcoin and StarkNet wallets to the bridge interface'
    },
    {
      number: '2',
      title: 'Transfer',
      description: 'Enter the amount and confirm the Bitcoin transaction'
    },
    {
      number: '3',
      title: 'Receive',
      description: 'Receive wrapped Bitcoin on StarkNet in just a few minutes'
    }
  ];

  return (
    <section className="how-it-works" id="how-it-works">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Transferring your Bitcoin to StarkNet in three simple steps</p>
        </div>
        <div className="steps">
          {steps.map((step, index) => (
            <div key={index} className="step">
              <div className="step-number">{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}