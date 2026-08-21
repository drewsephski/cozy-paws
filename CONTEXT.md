# Sitterfolio

Sitterfolio lets independent pet sitters publish a simple client-facing site and receive direct care inquiries.

## Language

**Site**:
A pet sitter's public business profile at a unique Sitterfolio address.
_Avoid_: Tenant, subdomain

**Profile**:
The pet sitter's business identity and care details published on a Site.
_Avoid_: Tenant data

**Profile ownership**:
The exclusive association between a signed-in user and a Profile they may view, change, or delete privately.
_Avoid_: Tenant ownership

**Site intake**:
The draft-to-launch process that validates a Site's address and required business details before publishing it.
_Avoid_: Onboarding intake, launch form

**Lead**:
A pet owner's availability request submitted through a Site.
_Avoid_: Contact record

**Lead status**:
The small commercial lifecycle of a Lead: new, qualified, quoted, booked, declined, or spam. Whether the sitter has read it is tracked separately.
_Avoid_: Payment status, deal stage, archived

**Business**:
The legal or operating pet-care business owned by one User. A Business owns Sites and the Stripe connected account that receives its payments.
_Avoid_: Account, tenant

**Payment request**:
A customer-facing request for one integer-cent total associated with a Lead. Its financial state is independent from Lead status.
_Avoid_: Invoice, booking

**Generated revenue**:
Successfully paid customer volume attributed to a Site, net of refunds and excluding lost disputes. It is not Sitterfolio's application-fee revenue.
_Avoid_: Platform revenue, profit

**Profile image**:
The owner-supplied public photo displayed on a Site.
_Avoid_: Upload, avatar
