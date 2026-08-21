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

**Profile image**:
The owner-supplied public photo displayed on a Site.
_Avoid_: Upload, avatar
