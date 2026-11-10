<!-- docs/decisions/2026-11-10-when-a-shop-name-in-a-description-has-irregular-sp.md -->
# When a shop name in a description has irregular spacing (two spaces, or a tab), should it still count as that shop?

- **Date:** 10 November 2026
- **Piece:** transaction-categories
- **Options:** A. Match the name exactly as written, so a doubled space is a miss (as the spec reads) (Nothing extra; some rows with odd spacing land in Other; Can be undone) · B. Treat any run of spaces or tabs as one space before matching (A small extra step in categoryOf and two more tests; Can be undone)
- **Recommended:** literal
- **Chosen:** literal
- **The director's words:** none
