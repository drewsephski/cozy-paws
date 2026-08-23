# Sitterfolio solo-operator market and pricing research

**Research date:** August 23, 2026  
**Target customer:** U.S.-first solo pet sitters who acquire clients independently of Rover  
**Proposed product:** A lightweight operating system spanning a sitter-owned website, clients and pets, booking requests, payments, and communication  
**Source standard:** Current first-party product, pricing, and policy pages only

## Recommendation in one sentence

Build Sitterfolio as **the calm, no-commission business home for solo sitters who already have their own clients**: one public link where a client can understand the sitter, request care, provide pet details, pay, and receive updates, paired with one deliberately small sitter workspace.

This can become a legitimate bootstrapped SaaS. The evidence does not presently justify treating it as a venture-scale marketplace. The credible wedge is not merely “avoid Rover fees,” because several established products already support direct operations. It is **getting an independent solo sitter from scattered texts, notes, calendars, and payment apps to a professional client experience with almost no setup or training**.

## Market reality

### Rover creates a powerful economic contrast—but is not the whole competitor

Rover currently says U.S. sitters take home 80% of each booking, while pet owners generally pay an additional 11% booking fee. Rover also charges sitters a location-dependent $49–$79 profile review fee. Rover says these fees fund marketplace customer acquisition, its guarantee, platform tools, and support. Therefore, “keep more” is economically concrete, but Sitterfolio must never imply that a flat software subscription also supplies Rover's demand, guarantee, or safety support. ([Rover service fees](https://support.rover.com/hc/en-us/articles/205385304-What-are-the-service-fees), [Rover profile fee](https://support.rover.com/hc/en-us/articles/203062400-Is-Rover-free))

At a hypothetical $1,000 per month in Rover-originated bookings, a 20% sitter fee is $200. An $8–$15 software subscription is trivial by comparison—but only for clients the sitter sourced independently and only if the software is genuinely easier than the sitter's current patchwork.

### The category already has serious software

| Product | Current official price for a solo operator | Relevant product promise | Implication for Sitterfolio |
|---|---:|---|---|
| **Pupline** | $12.99/month or $10.40/month billed annually; 30-day trial | Scheduling, client/pet records, no-login booking, calendar sync, invoicing, care cards, agreements, report cards, encrypted access details, notifications, and a free hosted website | The closest direct competitor and the price ceiling for an undifferentiated lightweight suite. Sitterfolio cannot win by listing the same features. ([Pupline](https://www.pupline.app/)) |
| **Precise Petcare** | $20/month; 5% annual discount | Full core feature set including scheduling, client accounts, billing, communication, reporting, GPS, mobile apps, and staff workflows | Confirms that working professionals will pay more for operational depth; also shows which complexity Sitterfolio should initially omit. ([Precise Petcare pricing](https://www.precisepetcare.com/pricing)) |
| **PetPocketbook** | $25/month or $23.75/month annually, plus a default 5% client-paid fee for in-platform payments | Scheduling, visit tracking, report cards, invoicing/payments, client management, communication, and team management | A subscription plus payment fee is accepted in the category, but “no Sitterfolio transaction fee” would be a cleaner promise for fee-sensitive sitters. ([PetPocketbook pricing](https://www.petpocketbook.com/home/pricing)) |
| **Pet Sitter Plus** | $18/month for the first year, then $36/month; affiliate pricing is lower | Scheduling, repeat services, client/pet profiles, GPS, visit reports, billing, Stripe, reporting, and support | Competes on breadth and support. Sitterfolio should compete on speed, focus, and client simplicity. ([Pet Sitter Plus pricing](https://www.petsitterplus.com/pricing)) |
| **Scout** | $39/month monthly or $33/month annually; SEO website is a $42/month add-on | Scheduling, invoices, clients, support, pet-parent experience, and optional branded app/site | Shows room for a lower-cost, website-native product, but also sets expectations that $30+ software handles substantial daily operations. ([Scout pricing](https://www.scoutforpets.com/pricing)) |
| **Time To Pet** | Lite $25/month or $250/year; Solo $50/month or $500/year | Scheduling, invoicing/payments, client management, conversations, recurring appointments, apps, integrations, and broader business operations | Validates higher willingness to pay among established operators; it is the upgrade path or integration target, not the initial feature checklist. ([Time To Pet pricing](https://www.timetopet.com/pricing)) |

The important discovery is Pupline. Its official page now makes almost the same “one calm app,” solo-operator, no-client-login, website-plus-operations claim contemplated for Sitterfolio, at $12.99/month. That does not kill the idea, but it removes “cheap all-in-one pet-sitting software” as defensible positioning.

## What to lean into

### 1. Own-client conversion, not marketplace replacement

The ideal user already gets business through referrals, Instagram, neighborhood groups, business cards, a Google Business Profile, or repeat relationships. Sitterfolio should turn those independently sourced prospects into organized clients.

Recommended promise:

> Your own pet-sitting business, in one link. Clients request care, share pet details, pay you, and stay updated. You keep your rate; Sitterfolio charges no booking commission.

Use “no booking commission” only if that becomes the actual commercial policy. Do not say “keep 100%” without immediately distinguishing ordinary card-processing fees.

### 2. A client experience with no account or app

For the first release, a pet owner should be able to:

1. Open the sitter's branded link.
2. See services, service area, availability guidance, trust details, and policies.
3. Request dates and provide household/pet/care information without creating an account.
4. Receive sitter approval, a price, and a secure hosted payment request.
5. Receive a confirmation and visit update through email or a private link.

The sitter should be able to:

1. Review and accept or decline the request.
2. See the booking on one calendar.
3. Reuse the household and pet record for the next request.
4. Request and reconcile payment.
5. Send one templated confirmation or visit update.

This is a coherent operating loop. Building staff scheduling, payroll, GPS tracking, route optimization, deep accounting, native apps, or an open consumer marketplace would surrender the simplicity advantage.

### 3. Website and operations must be the same record

Generic site builders can make a page, while established pet-care suites can run a schedule. Sitterfolio's product advantage should be that a sitter enters a service, rate, service area, availability rule, policy, or testimonial once and it appears everywhere appropriate: public site, inquiry flow, quote/payment request, and client record.

That shared record is more defensible than a prettier template. It also makes onboarding measurable: the activation event is not “created an account”; it is “published a site, imported or added a real client, and sent or received a real request.”

### 4. Fee transparency should be a product principle

Stripe's current U.S. standard price begins at 2.9% + 30 cents for a successful domestic online card transaction, with no setup or monthly fee for standard Payments. Stripe-hosted Checkout is included with Payments. ([Stripe Payments pricing](https://stripe.com/pricing))

Stripe Connect says a platform that lets Stripe handle pricing for connected accounts incurs no additional platform account or payout fees, and can collect an additional application fee; a platform that handles payment pricing itself incurs $2 per monthly active account and 0.25% + 25 cents per payout. ([Stripe Connect pricing](https://stripe.com/connect/pricing))

For the initial proposition, let Stripe charge the sitter its standard processing fees and charge **no Sitterfolio application fee**. That makes the pricing sentence honest and memorable:

> Pay Sitterfolio for software, not for every booking. Standard Stripe processing still applies.

Payments can become a monetization lever later only if customers prefer it to a higher subscription and retention evidence supports the tradeoff. Leading with both a subscription and an application fee weakens the exact reason fee-sensitive sitters are leaving marketplace economics.

## Pricing recommendation

### Do not make $8 the permanent list price for the full product

$8/month is emotionally appealing and can work as a founding-customer offer, but it leaves little room for customer support, payment failures, email/SMS usage, storage, domains, or acquisition. More importantly, price alone will not defend Sitterfolio from Pupline at $12.99/month.

Recommended structure:

- **Founding plan: $8/month, price locked while continuously subscribed.** Limit to the first 25–50 interviewed, concierge-onboarded sitters. This turns the user's preferred number into a recruitment and learning device.
- **Solo: $12/month or $99/year.** Include the branded site/subdomain, unlimited clients and pets, booking requests, calendar, email confirmations/updates, and Stripe payment requests. No Sitterfolio transaction fee.
- **Solo Plus: postpone.** Add a $19–$24 tier only after customers repeatedly ask for a custom domain, SMS, automations, richer reporting, or advanced branding and the real delivery cost is known.
- **Concierge setup: optional $99–$149 once.** Import initial clients, configure services/policies, shape public copy, and connect a domain. This generates early cash and exposes onboarding friction.

Avoid a heavily gated free-forever operational plan. A 30-day no-card trial with a usable demo business—or a permanently free public page that does not include the operating workspace—is safer. The mature products commonly offer 14- or 30-day trials, so asking for payment before a sitter completes a real loop will feel unusually risky. ([Pupline](https://www.pupline.app/), [Time To Pet pricing](https://www.timetopet.com/pricing), [Pet Sitter Plus pricing](https://www.petsitterplus.com/pricing))

## Rover policy boundary

Rover's official guidance says paying and communicating through Rover is required by its Terms of Service; off-platform payment removes Rover's record, Guarantee, and 24/7 support, and can lead to suspension of sitter and owner accounts. ([Rover off-platform payment guidance](https://support.rover.com/hc/en-us/articles/206609753-What-if-a-client-wants-to-pay-me-directly-not-on-Rover-s-site))

Therefore:

- Market Sitterfolio for **clients the sitter found independently**, never as a tool for diverting an active Rover relationship.
- Put a plain boundary in onboarding and marketing: “Use Rover for relationships and bookings initiated on Rover. Sitterfolio is for clients you acquire independently.”
- Do not build Rover-message import, scraping, migration prompts, or outreach copy encouraging users to take Rover clients off-platform.
- Do not imply equivalent protection to Rover's Guarantee. Encourage sitters to carry appropriate independent insurance and use clear agreements, but do not make legal or insurance adequacy claims without jurisdiction-specific support.

The safest aggressive marketing contrast is: “For clients you find yourself, use software that works for your business.”

## Acquisition implications

At $99–$144 annual revenue, broad paid acquisition is unlikely to work initially. Distribution must be founder-led, referral-driven, community-led, or compounding content.

### First 25 paying customers

1. Recruit solo sitters who visibly operate through Instagram, Facebook, a Google Business Profile, or a weak generic site and already offer direct booking.
2. Offer the locked $8 founding plan plus personal setup—not free custom development—in exchange for a 30-day operating review.
3. Import one real household and send one real booking/payment flow during onboarding. Do not count a published demo page as activation.
4. Interview around the last five bookings: source, number of messages, information collected, pricing, payment method, updates, and anything forgotten.
5. Review every lost or abandoned request manually. The language and workflow failures will define the roadmap better than a feature poll.

### Repeatable channels to test next

- Partnerships with pet-sitter educators, insurance providers, first-aid instructors, and professional associations, using useful templates or workshops rather than large upfront affiliate payments.
- Search content for high-intent operational jobs: pet-sitting intake form, meet-and-greet checklist, pet care instructions, cancellation policy template, direct-booking setup, and pet-sitting invoice—not broad “find a pet sitter” marketplace terms.
- A restrained “Powered by Sitterfolio” referral loop on public sites, removable on paid plans only if it demonstrably drives acquisition.
- Client-to-sitter referrals: after a successful booking, let a client share Sitterfolio with another independent sitter they use.

Do not buy broad ads until one organic/manual channel repeatedly produces activated, retained payers. An $8–$12 subscription cannot absorb much experimentation with paid CAC.

## Product gates for a legitimate business

Treat the following as proof gates, in order:

1. **Problem proof:** 15–20 target sitters show the last five real bookings and confirm repeated administrative pain.
2. **Activation proof:** 10 concierge-onboarded sitters each publish, add/import a real client, and complete a real request or payment workflow.
3. **Payment proof:** at least 5 pay the $8 founding price with their own card, not a verbal promise.
4. **Habit proof:** at least half of initial payers use Sitterfolio for a second client interaction or repeat booking within 45 days.
5. **Retention proof:** at least 70% of early paid accounts remain after 90 days, and cancellations are categorized.
6. **Channel proof:** one repeatable source produces at least 10 activated sitters without founder friends or personal favors.

Early metrics should be operational, not vanity metrics: time to first live site, time to first real client, request-to-acceptance rate, accepted-request-to-payment rate, repeat-booking rate, and 30/60/90-day paid retention.

## Strategic conclusion

Sitterfolio should lean into being a **small-business operating home**, not a marketplace and not a broad enterprise pet-care suite. The differentiator is a unified, extremely simple, no-client-app journey from “here is my sitter” to “the care is booked and paid,” with the sitter's public business and back office driven by the same data.

The hard truth is that Pupline already occupies much of this language and feature territory for $12.99/month. The winning response is not to undercut it forever or clone every feature. It is to be narrower and visibly faster for the exact solo sitter who already has clients: no staff machinery, no complex setup, no Sitterfolio booking commission, and a polished client link that works before the sitter learns a software system.

Use $8 as a locked founding offer. Plan for $12/month or $99/year as the sustainable core price. If customers will not pay that after completing one real booking loop, the problem is not pricing; it is insufficient product value or an acquisition wedge that does not exist.
