# Heartland Avian Rescue Partnership (HARP) Website
Your project's description...

## Environments
- Preview: https://main--harp-site--dkuntze.hlx.page/
- Live: https://main--harp-site--dkuntze.hlx.live/

## Installation

```sh
npm i
```

## Linting

```sh
npm run lint
```

## Local development

1. Create a new repository based on the `aem-boilerplate` template and add a mountpoint in the `fstab.yaml`
1. Add the [AEM Code Sync GitHub App](https://github.com/apps/aem-code-sync) to the repository
1. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
1. Start AEM Proxy: `aem up` (opens your browser at `http://localhost:3000`)
1. Open the `{repo}` directory in your favorite IDE and start coding :)

## Authoring bird profiles

Each bird (or bonded group) has one document at `/adoption/birds/{unique-name}`.
Duplicate a profile document to add a bird. Keep that URL after adoption; do not
reuse it for a different bird.

### Profile document

Create a two-column table with a merged header named **Available Bird** and one
content row:

| Photo | Introduction |
| --- | --- |
| A photo with descriptive alternative text | The bird's name, formatted as **Heading 1**, followed by one short introductory paragraph |

The column labels above explain the content; **do not add a Photo/Introduction
header row**. The first paragraph supplies the listing preview automatically.
Keep it to about 25-40 words. Below the block, write the full biography as normal
paragraphs under headings such as "Getting to know Jon," "Daily care," "Ideal
home," and "Cage requirements." There is no need to put the biography in a table.
Keep all important care and suitability information when migrating existing birds.

Add a standard **Metadata** table at the bottom of the document:

| Metadata | |
| --- | --- |
| Bird species | Green cheek conure |
| Bird age | About 2 years |
| Bird sex | Unknown |
| Adoption fee | $200 |
| Adoption status | Available |
| Title | Meet Jon, a green cheek conure for adoption - HARP |
| Description | Meet Jon and learn about his care needs and adoption through HARP in the Lincoln, Omaha, and Council Bluffs metro areas. |

As with any EDS metadata table, merge its header cells. **Bird species** and
**Adoption status** should be provided on every profile. Age, sex, and fee are
optional and disappear when omitted. Enter unknown facts as "Unknown" rather than
guessing. Title and description are search/share metadata, not extra card fields;
the listing derives its name, introduction, and photo directly from the block.
The first profile photo is also the default social image; use standard **Image**
metadata if a different social image is desired.

Use exactly one of these adoption statuses (case does not matter):

| Status | Listing | Profile |
| --- | --- | --- |
| Available | Shown | Application link |
| Pending | Shown with pending label | No application link |
| Adopted | Removed | Adopted message and link to other birds |

Blank or unrecognized statuses hide the profile from the listing and suppress the
application link. Publishing a status change updates the index; previewing alone
does not. Allow for normal index/CDN propagation. Update the title and description
after adoption so search results do not continue advertising availability.

The current key/value Available Bird blocks still work during migration, including
their separate Apply Now links. Do not copy those old application links below new
profiles: the new profile supplies the appropriate action based on status.

### Automatic listing

At `/adoption/available-birds`, keep a page title, brief introduction, service area,
and link to `/adoption/requirements`. Replace the old biographies with a one-column
table named **Bird Listing**, containing a single link to `/bird-index.json`.
No per-bird entries or duplicated summaries are needed. The listing sorts by name
and includes search, a species filter, and available/pending status labels.

### Index setup and rollout

`helix-query.yaml` defines the dedicated `/bird-index.json` index and extracts from
**authored HTML and metadata**, not the JavaScript-decorated DOM.

1. For repository-managed configuration, deploy `helix-query.yaml`. For a site
   using the AEM Configuration Service, merge its `birds` definition into the
   existing query configuration using [Index Admin](https://tools.aem.live/tools/index-admin/index.html)
   or the authenticated `POST /config/dkuntze/sites/harp-site/content/query.yaml`
   Admin API. **Do not overwrite other existing index definitions.** The file in
   Git alone does not activate a Configuration Service index.
2. Create and preview the individual profile documents. Confirm the full stories,
   photos, care requirements, fees, and statuses against the existing listing.
3. Publish approved profiles, then reindex with Index Admin. Verify
   `/bird-index.json` returns their names, photos, introductions, species, and
   statuses. The index contains published pages even when requested on a preview
   host; it never includes preview-only documents.
4. Ensure the existing sitemap configuration includes `/adoption/birds/**` (or
   adds `/bird-index.json` as a source). Preserve the rest of the site's sitemap.
   Verify each published profile has its own canonical URL, unique title,
   description, and social image. These crawlable documents, internal links, and
   sitemap entries matter more than JavaScript-only enhancements for SEO/GEO.
   Profile decoration also adds general WebPage/Thing structured data; this does
   not imply eligibility for an animal-adoption rich result.
5. Preview the new Bird Listing on a draft document first. Once the index and
   profiles are verified, replace and publish the existing listing. Keep the
   original biographies until that cutover is approved. Adopted profiles remain
   published at their original URLs but no longer appear in the listing.

Production content and Configuration Service settings are separate from this code
repository and are not changed by deploying the blocks.

### Browser tests and local examples

```sh
npx playwright install chromium
aem up --no-open --no-stop-other --url https://www.heartlandavianrescueproject.org \
  --html-folder test/fixtures --html-mount /test
# In another terminal:
npm test
npm run lint
```

Local examples: `/test/bird-profile`, `/test/available-birds`, and
`/test/legacy-bird`. The local listing links to `/test/fixtures/bird-index.json`
for a manual preview without an activated index; never publish that fixture link.
Browser tests intercept the index request and cover pagination, status exclusions,
errors/retry, and filtering at mobile/tablet/desktop sizes.
Fixture profiles include excerpts of existing biographies and test-only statuses;
they are not complete migration documents. Tests and fixtures are excluded from
Edge Delivery code delivery by `.hlxignore`.
