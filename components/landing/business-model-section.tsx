"use client";

import { motion } from "framer-motion";

const plans = [
  {
    name: "Free",
    price: "0 AZN/month",
    description: "Limited access",
    points: ["Limited quiz attempts", "Basic analytics", "Single-user profile"],
    featured: false,
  },
  {
    name: "Standard",
    price: "29 AZN/month",
    description: "5 subjects",
    points: ["Up to 5 subjects", "Adaptive question generation", "Weekly personalized plan"],
    featured: true,
  },
  {
    name: "Premium",
    price: "49 AZN/month",
    description: "Full access",
    points: ["All subjects", "Advanced analytics dashboard", "Priority AI plan refresh"],
    featured: false,
  },
];

export function BusinessModelSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 md:px-6">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Business Model</p>
        <h2 className="mt-3 text-3xl font-bold md:text-4xl">Flexible Pricing for Every Learner</h2>
        <p className="kairo-muted mt-3 max-w-2xl">
          Start free, upgrade when needed, and choose the plan that matches your preparation intensity.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((plan, index) => (
          <motion.article
            key={plan.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            className={`rounded-3xl p-6 ${
              plan.featured
                ? "border border-red-400 shadow-[0_0_40px_-8px_rgba(239,68,68,0.55)] bg-red-500/10"
                : "kairo-card"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              {plan.featured ? (
                <span className="rounded-full border border-red-400/50 bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300">
                  Most Popular
                </span>
              ) : null}
            </div>

            <p className="text-3xl font-black text-red-400">{plan.price}</p>
            <p className="kairo-muted mt-2 text-sm">{plan.description}</p>

            <ul className="kairo-muted mt-5 space-y-2 text-sm">
              {plan.points.map((point) => (
                <li key={point}>- {point}</li>
              ))}
            </ul>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
