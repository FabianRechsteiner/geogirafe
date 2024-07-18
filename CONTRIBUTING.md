# Contribution guidelines

If you're reading this, you're probably thinking of contributing to GeoGirafe, and we're delighted!

In this document, you will find some essential information to help and guide you in your contributions.
You'll also find a few rules to follow so that you can contribute effectively to the project.

## Before contributing

Generally speaking, the GeoGirafe project is open to contributions of any kind.
There is no need for discussion if you contribute just a simple and quite obvious bugfix. So... just do it!

But for complexer changes or if you want to extent the functionalities, please **first open an issue to discuss your contribution before starting the work**. Let us know that you plan to contribute **before** you do any coding. Use mailing list or developer chat. Just avoid future disappointments and **let us know** early.

This will also avoid conflicts with others also working on the same subject.

## Licensing

Licensing is very important to open source projects. It helps ensure the software continues to be available under the terms that the author desired.

Please ensure you agree with the license of the project before contributing.

## Effectively contributing

### 1. Activate the pre-commit hooks

To enforce a consistent style of the code in the whole application, we have decided to use [prettier](https://prettier.io/).  
If you commit regularly, prettier should be integrated in the git pre-commit hooks.  
This can be done with the following command:

```
git config core.hookspath buildtools/git-hooks
```

### 2. Create a Branch and a Merge-Request

The first of all thing is to create a branch for your contribution.
Give it a intelligible name, and create an associated Merge-Request.

Add a description to the Merge-Request to explain with is it for, and mark it as _Draft_.

### 3. Code, commit early, push often.

For your contribution, please be attentive to the following points:

- Readable code is better than comments. Choose good class, method and variable names.
- Clean up the code: please delete commented code from your final contribution.
- Keep functions small and modular. The function complexity will be checked by our Sonarcloud rules.
- Do not add any external dependency to the project before discussing it. We do not want GeoGirafe to fall in the Npm-Blackhole of dependencies and to become unmaintainable.
- Ensure you deliver a minimum documentation of your contribution.
- Manage errors cases properly: Promises must be awaited and end with a .catch().
- Please declare variables properly as var, let and const depending on the case.
- Minimize nested test conditions to avoid brain overload.
- Please avoid the usage of foEach() loops. Prefer "for" and "for-of" loops instead: they preserve context, and can be breaked.
- There is little reason to NOT commit/push frequently. It doesn’t hurt, and you'll get feedback from the pipelines early.

### 4. Validate your Merge-Request

When you're done with the code, it's time to make a great Merge-Request !
Please:

- Verify there is not conflict that would prevent an merge of your code.
- Check the linting with `npm run lint`
- Verify that the pipelines passed successfully on your branch: https://gitlab.com/geogirafe/gg-viewer/-/pipelines
- Check the Sonarcloud reports directly on the Merge-Request, and fix the reported errors.
- Verify the accessibility of your contribution by using the Wave tools: https://wave.webaim.org/

When everything seems ok for you, you can remove the _Draft_ flag, and request a review from the GeoGirafe Team.

### 5. Review and merge

Every contribution will be reviewed. Therefore, the contribution quality should be appropriate (see points 2 and 3).

Once the merge request has been reviewed and accepted, it will be merged. If some changes are needed on your Merge-Request, we'll get in touch with you.

## Communication channels

You can contact us through the following channels:

- By opening an issue in this GitLab Repository
- By Email

## Thank you!

> «&nbsp;We ourselves feel that what we are doing is just a drop in the ocean.  
> But the ocean would be less because of that missing drop.&nbsp;»

A big thank to all the contributors of GeoGirafe, in alphabetical order:

- Anja Sutter @u222052 (Geoinformation Basel-Landschaft)
- Anne Maier @svamaa (Geoinformation Basel-Stadt)
- Arnaud Poncet-Montanges @ponceta (SIGIP)
- Ben Koch @beeekey (OpenGIS)
- Benjamin Gerber @ger-benjamin (Camptocamp SA)
- Clemens Rudert @crud3_r (OpenGIS)
- Corentin Junod @D0lpic (SITN Neuchâtel)
- Daniel Gnerre @gnerred (Cartoriviera)
- Didier Dupertuis @dddpt (OpenGIS)
- Dietmar Schneider @sdietmar (Techplus Tirol)
- Guillaume Remy @remyguillaume (Geoinformation Basel-Stadt)
- Karsten Deininger @kdeininger (Geoinformation Basel-Landschaft)
- Loris Hubler @hubi_bs (Geoinformation Basel-Stadt)
- Matthew Parkan @matthew.parkan (SITN Neuchâtel)
- Michael Müller @michmuel (Geoinformation Basel-Landschaft)
- Olivier Monod @monodo (Yverdon-les-bains)
- Pauline Fanguin @pfanguin (Cartolacote)
- Rémi Bovard @rbovard (Cartoriviera)
- Ruth Albrecht (Geoinformation Basel-Landschaft)
- Stéphane Malta e Sousa @maltaesousa (SITN Neuchâtel)
