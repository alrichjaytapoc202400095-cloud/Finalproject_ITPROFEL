# SPC Book Store — Concept Statement (L3-01)

**Business.** SPC Book Store is the campus bookstore of St. Peter's College,
Iligan City: the one-stop shop for required textbooks (by course code), school
supplies, PE uniforms and reviewers.

**Customer.** SPC students and employees. They browse by course code or search
by subject, buy online, and either have items delivered or pick them up on
campus between classes.

**Administrator.** The bookstore staff: they manage the catalog and stock with
auditable adjustments, run the student-verification queue, control pickup-slot
capacity for busy weeks (enrollment, exam week), and track orders through the
lifecycle.

## Why this concept needs custom rules

A generic store template cannot express three campus realities:

1. **Students are a verified, discounted group.** Only enrolled students deserve
   the bookstore's student discount, so the discount must be tied to a verified
   student record — approved by staff, not a self-serve coupon.
2. **Campus pickup is capacity-limited by the day and hour.** Pickup happens at
   the bookstore counter; the store must cap how many orders can claim each
   time window (e.g., 5 per morning) and release capacity when orders are
   cancelled or expire.
3. **The academic calendar gates availability.** Some titles (e.g., the
   yearbook, next-semester textbooks) are sold as pre-orders that cannot be
   purchased before their release date.

## Differentiated features (≥ 2, each changes data model + API + rules)

| Feature | Data model change | Server-side rule | API | UI path |
|---|---|---|---|---|
| 1. Verified-student discount | `users.student {number, course, year, status}`; verification queue | automatic `STUDENT_DISCOUNT_PERCENT` applied at checkout only for `student.status === 'verified'` | `POST /auth/student-verification`, `GET /admin/students`, `PATCH /admin/students/:id/verification` | register form → admin Students tab → checkout banner |
| 2. Campus pickup slots | `pickupslots` collection (date+window unique, capacity, booked) | atomic capacity-checked booking; slot released on cancel/expire; pickup orders ship free | `GET /pickup-slots`, `/admin/pickup-slots*`; checkout `method: 'pickup'` + `pickupSlotId` | checkout slot picker → admin Slots tab |
| 3. Course-coded catalog + pre-orders (supporting) | `products.courseCode`, `isPreOrder`, `releaseDate` | course filter in search; unreleased pre-orders rejected | `GET /products?course=IT101`; 422 `PREORDER_NOT_RELEASED` | catalog filter chip → product page badge |

Both main features are demonstrated live in the defense with real data, and
both would fail without their rules: without verification, anyone could claim
the student discount; without atomic slots, two customers could overbook the
same pickup window.

**AI tie-in.** The assistant maps a course code or subject ("what do I need for
IT301?") to real catalog entries, using `courseCode` as retrieval signal.
