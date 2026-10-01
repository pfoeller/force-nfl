# FORCE V21 export paging audit

The user-supplied five-page DEN–KC export showed three distinct problems in V20:

1. Page 5 contained only the data-warning/footer area and had no real social-share value.
2. Pages 2 and 3 were substantially underfilled even though later pages contained useful material.
3. Split cloned fragments could report zero height after being detached from the staging DOM, allowing the paginator to underestimate content and clip useful rows.

V21 changes the pagination objective from rigid 16:9 slicing to content-density-first social pages:

- desktop minimum 1200×675 (16:9), with useful growth up to 1200×980;
- mobile portrait minimum with up to 24% controlled extra height;
- variable output height per page;
- matchup duel rows split into smaller chunks that can fill remaining space;
- detached chunks retain their measured export height;
- tiny final pages are merged or rebalanced when possible;
- social exports omit back buttons, interactive QB controls, prototype footer, and matchup data-warning boilerplate.

The goal is fewer, fuller images without returning to a single skyscraper export.
