$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$templatePath = Join-Path $root "templates\carpet-cleaning-suburb.template.html"
$dataPath = Join-Path $root "data\carpet-cleaning-suburbs.json"

$template = Get-Content -Raw -Path $templatePath -Encoding UTF8
$suburbs = Get-Content -Raw -Path $dataPath -Encoding UTF8 | ConvertFrom-Json

function ConvertTo-HtmlSafe {
  param([string]$Value)
  if ($null -eq $Value) { return "" }
  $escaped = [System.Net.WebUtility]::HtmlEncode($Value)
  return $escaped -replace "&#39;", "'"
}

function Render-CardItems {
  param([array]$Items)
  return (($Items | ForEach-Object {
    "<article class=""c""><p class=""small"">$(ConvertTo-HtmlSafe $_)</p></article>"
  }) -join [Environment]::NewLine)
}

function Render-ListItems {
  param([array]$Items)
  return (($Items | ForEach-Object {
    "<li>$(ConvertTo-HtmlSafe $_)</li>"
  }) -join [Environment]::NewLine)
}

function Render-Pills {
  param([array]$Items)
  return (($Items | ForEach-Object {
    "<span class=""pill"">$(ConvertTo-HtmlSafe $_)</span>"
  }) -join [Environment]::NewLine)
}

function Render-FaqItems {
  param([array]$Items)
  return (($Items | ForEach-Object {
    $question = ConvertTo-HtmlSafe $_.question
    $answer = ConvertTo-HtmlSafe $_.answer
    "<details class=""accordion""><summary aria-expanded=""false"">$question</summary><div class=""accordion-content""><p class=""sub"">$answer</p></div></details>"
  }) -join [Environment]::NewLine)
}

function Render-RelatedLinks {
  param([array]$Items)
  return (($Items | ForEach-Object {
    $href = $_.href
    $label = ConvertTo-HtmlSafe $_.label
    $text = ConvertTo-HtmlSafe $_.text
    "<a class=""link-card"" href=""$href""><strong>$label</strong><span>$text</span></a>"
  }) -join [Environment]::NewLine)
}

foreach ($suburb in $suburbs) {
  $html = $template
  $canonicalUrl = "https://www.quickfresh.com.au/$($suburb.slug)"
  $nearbyAreasText = ($suburb.nearbyAreas -join ", ")

  $replacements = @{
    "{{PAGE_TITLE}}" = ConvertTo-HtmlSafe $suburb.pageTitle
    "{{META_DESCRIPTION}}" = ConvertTo-HtmlSafe $suburb.metaDescription
    "{{CANONICAL_URL}}" = $canonicalUrl
    "{{H1}}" = ConvertTo-HtmlSafe $suburb.h1
    "{{INTRO_PARAGRAPH}}" = ConvertTo-HtmlSafe $suburb.introParagraph
    "{{SEO_INTRO}}" = ConvertTo-HtmlSafe $suburb.seoIntro
    "{{LOCAL_INTRO_HEADING}}" = ConvertTo-HtmlSafe $suburb.localIntroHeading
    "{{LOCAL_INTRO_TEXT}}" = ConvertTo-HtmlSafe $suburb.localIntroText
    "{{VIDEO_HEADING}}" = ConvertTo-HtmlSafe $suburb.videoHeading
    "{{VIDEO_INTRO}}" = ConvertTo-HtmlSafe $suburb.videoIntro
    "{{WHY_CHOOSE_INTRO}}" = ConvertTo-HtmlSafe $suburb.whyChooseIntro
    "{{JOBS_INTRO}}" = ConvertTo-HtmlSafe $suburb.jobsIntro
    "{{FAQ_INTRO}}" = ConvertTo-HtmlSafe $suburb.faqIntro
    "{{CTA_TEXT}}" = ConvertTo-HtmlSafe $suburb.ctaText
    "{{CTA_BLURB}}" = ConvertTo-HtmlSafe $suburb.ctaBlurb
    "{{PROOF_SECTION_TEXT}}" = ConvertTo-HtmlSafe $suburb.proofSectionText
    "{{SUBURB_NAME}}" = ConvertTo-HtmlSafe $suburb.suburbName
    "{{SLUG}}" = $suburb.slug
    "{{NEARBY_AREAS_TEXT}}" = ConvertTo-HtmlSafe $nearbyAreasText
    "{{WHY_CHOOSE_US_ITEMS}}" = Render-CardItems $suburb.whyChooseUs
    "{{COMMON_JOBS_ITEMS}}" = Render-ListItems $suburb.commonJobs
    "{{NEARBY_AREAS_ITEMS}}" = Render-Pills $suburb.nearbyAreas
    "{{FAQ_ITEMS}}" = Render-FaqItems $suburb.faq
    "{{RELATED_LINKS}}" = Render-RelatedLinks $suburb.internalLinks
  }

  foreach ($key in $replacements.Keys) {
    $html = $html.Replace($key, [string]$replacements[$key])
  }

  $outputPath = Join-Path $root "$($suburb.slug).html"
  [System.IO.File]::WriteAllText($outputPath, $html, [System.Text.UTF8Encoding]::new($false))
}
