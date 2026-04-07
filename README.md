# VibeCode Olympics — RecipeBox

Two versions of RecipeBox deployed to GitHub Pages for A/B comparison in the VibeCode Olympics hackathon.

| Version | URL |
|---------|-----|
| Original (baseline) | https://son-engr-kr.github.io/the-vive-code-olympics-beta/original/ |
| Advanced (with serving size calculator) | https://son-engr-kr.github.io/the-vive-code-olympics-beta/advanced/ |

## Site structure

```
index.html          — Homepage with 6 featured recipes
browse.html         — Browse by cuisine (6 cuisines)
{cuisine}.html      — Cuisine pages with recipe listings
recipe-*.html       — 30 recipe detail pages
about.html          — About RecipeBox
```

## Key difference: Advanced vs Original

The **advanced** version adds a **serving size calculator** on each recipe's ingredient list.
Enter the number of people and all ingredient quantities recalculate instantly.
This demonstrates interactive functionality to the AI agent evaluator.
