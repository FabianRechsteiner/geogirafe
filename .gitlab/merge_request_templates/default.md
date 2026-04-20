## Description

_What is the purpose of this Merge Request?_  
_What problem does it solve?_  
_What are the linked issues or references?_

## Job done

_Briefly explain what was done and highlight the key points to understand._  
_If technical choices need justification, please provide the explanation here._  
_(These details should help the reviewer understand the changes.)_

## Release-Notes

_The text in this section will be used to generate the release notes._  
_Please provide a simple, user-friendly description of what was done._  
_Avoid technical details—write for end-users only._  
_(No images, just text.)_

## Migration Steps / Breaking-Changes

- [ ] Check this box if migrating to this version requires manual work.

_If checked, document the required steps below._
_Examples of changes that require manual migration:_

- _Updates to main templates (index.html, mobile.html, ...)_
- _Update to main typescript files (main.ts, main.\*.ts, ...)_
- _Renaming or deletion of a configuration entry (config.json file)_
- _Renaming od deletion of a public/protected method in an exported class_
- _Migration to a new version of a dependency with breaking changes_

## Definition of Done

### For the Developer:

- [ ] Code compiles and conforms to defined coding standards (eslint, tsc, prettier).
- [ ] If necessary (at the developer's discretion), unit tests have been added for critical parts.
- [ ] All unittests run without error.
- [ ] NEW: The UI was tested in both Light and Dark mode
- [ ] Sonar-Scan returns no new issues or security hotspots.
- [ ] Documentation has been updated where necessary (see documentation repository).
- [ ] Merge-Request contains a few explanations of what was done (incl. release notes & migration steps).
- [ ] A Reviewer has been assigned to the Merge-Request.

### For the Reviewer:

- [ ] New code was reviewed.
- [ ] If comments could be added on unclear code, the developer has been informed.
- [ ] If unitests could be added in certain places, the developer has been informed.
- [ ] All pipelines work.
- [ ] The changes were tested on demo environment: https://demo.geomapfish.dev/mr-{mergerequestid}/
- [ ] Application performance has not been degraded by the modifications.
- [ ] Merge-Request was merged on main branch.
