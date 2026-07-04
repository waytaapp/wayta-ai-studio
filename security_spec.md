# Security Specification for Wayta (Realtime Database)

## Data Invariants
1. A user profile MUST have a valid role and match the authenticated UID.
2. An order MUST belong to a user and a venue.
3. A product MUST belong to a venue.
4. A budget MUST belong to a user and a venue.
5. Only STAFF (Admin, Manager, Bartender, etc.) can see all orders for a venue.
6. A user can only see their own PII (email, phone).
7. Admins have full access.

## The Dirty Dozen Payloads (Attack Vectors)
1. **Identity Spoofing**: Create a user node with a UID that doesn't match `auth.uid`.
2. **Privilege Escalation**: Update own user node to set `role` to 'ADMIN'.
3. **Shadow Update**: Add a `hidden_admin` field to a venue node.
4. **ID Poisoning**: Use a 2KB string as a `venueId`.
5. **Orphaned Order**: Create an order for a non-existent venue.
6. **State Shortcutting**: Update an order status from 'Pending' to 'Paid' without going through payment.
7. **PII Leak**: Read another user's email via a global listener.
8. **Budget Bypass**: Update another user's budget limit.
9. **Spam Reviews**: Create 100 reviews in 1 second.
10. **Resource Exhaustion**: Send a 1MB string in a product name.
11. **Admin Spoofing**: Try to update an email template as a regular user.
12. **Sync Vulnerability**: Update an order without updating the associated budget/inventory.

## The Rules Evaluator (database.rules.json)
Realtime Database uses JSON-based rules. The current configuration is stored in `database.rules.json`.
```
