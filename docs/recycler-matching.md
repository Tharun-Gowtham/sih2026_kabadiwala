# Recycler Matching

## Purpose

Help the Dealer find a suitable recycler for a lot.

---

# Inputs

Matching considers:

1. Material acceptance
2. Rate
3. Distance
4. Pickup availability

---

# Eligibility

A recycler should be considered suitable only when they accept the
material category.

Example:

Lot:

PCB

Recycler A:

Accepts PCB → eligible

Recycler B:

Does not accept PCB → unsuitable

---

# Ranking

Prototype weights:

Distance: 50%
Rate: 30%
Pickup availability: 20%

These weights are demo ranking weights.

They assist the dealer.

They do not automatically choose a recycler.

---

# Example

Recycler A:
12 km
₹500/kg
Pickup available

Recycler B:
25 km
₹540/kg
Pickup available

Recycler C:
8 km
₹470/kg
Pickup unavailable

The application produces a ranked list.

The Dealer selects the final recycler.

---

# Distance

For the prototype, Haversine distance can be used if a full geospatial
database is unnecessary.

The system should not block the project because of PostGIS complexity.

---

# Output

Recommended Recycler:

- Recycler ID
- Name
- Distance
- Rate
- Pickup availability
- Accepted material
- Score/rank

---

# Important

Matching is a recommendation system.

The Dealer remains the decision maker.