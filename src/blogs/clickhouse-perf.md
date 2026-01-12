---
title: "ClickHouse's JSON: 6.5x Faster"
date: 2024-12-15
slug: clickhouse-perf
---

# ClickHouse's Native JSON: 6.5x Faster and I Wish I'd Had This at Baselime

For the past four years, teams building observability tools for unstructured logs have been using one of two hacks with ClickHouse to query JSON data without defining schemas upfront.

**The hacks:**
- JSON as pairwise arrays — [Uber's approach](https://www.uber.com/en-GB/blog/logging/)
- JSON as a string — [PostHog's approach](https://posthog.com/handbook/engineering/clickhouse/working-with-json)

I've lived with both. At Baselime we spent a year with Boris trying to build the perfect observability tool, and let me tell you — watching queries crawl across millions of log lines while customers waited was not the vibe.

ClickHouse 24.8 shipped a native JSON type. They published a [benchmark against Mongo, Elastic, and friends](https://clickhouse.com/blog/json-bench-clickhouse-vs-mongodb-elasticsearch-duckdb-postgresql) but didn't compare it to the old hacks. So I had to do it myself.

---

## The Setup (Skip This)

Downloaded 100M rows from the [Bluesky dataset](https://github.com/ClickHouse/JSONBench/). RIP ClickHouse Cloud's AWS bandwidth bill — did nobody tell them R2 has free egress?

```bash
wget --timestamping --directory-prefix ~/data/bluesky \
  --input-file <(seq --format "https://clickhouse-public-datasets.s3.amazonaws.com/bluesky/file_%04g.json.gz" 1 100)
```

Loading as a string? Easy. Loading as pairwise arrays? Had to get Claude to write me a [janky Python script](https://gist.github.com/Ankcorn/966aa24999d19773a9eece1e91a92847) because I couldn't figure out how to do it in pure SQL. Loading as native JSON? One `parseJSON()` call. Already winning.

---

## The Numbers

### Analytics Query (Group By)

| Approach | Time | Data Read |
|----------|------|-----------|
| Pairwise arrays | 13.19s | 66.58 GB |
| String + JSON_VALUE | 11.76s | 48.61 GB |
| **Native JSON** | **2.00s** | **6.59 GB** |

**6.5x faster.** And look at that data read difference — 6GB vs 66GB. The native type only touches the columns it needs.

### Needle in Haystack (Find One Record)

| Approach | Time | Data Read |
|----------|------|-----------|
| Pairwise arrays | 12.63s | 66.58 GB |
| String + JSON_VALUE | 10.76s | 48.61 GB |
| **Native JSON** | **1.65s** | **8.04 GB** |

**7.7x faster.** This is the "why is this customer's request failing" query. The one you run at 2am. 1.6 seconds vs 12 seconds matters.

### Storage

| Table | Compressed |
|-------|------------|
| String | 19.28 GiB |
| Pairwise arrays | 18.65 GiB |
| Native JSON | 18.53 GiB |

Basically identical. No tradeoff here.

---

## The Syntax Is Also Just... Better?

**Pairwise arrays:**
```sql
SELECT string_values[indexOf(string_names, 'commit.collection')] as collection
FROM bluesky_kv
```

**String:**
```sql
SELECT JSON_VALUE(json, '$.commit.collection')
FROM bluesky_string
```

**Native JSON:**
```sql
SELECT json.commit.collection
FROM bluesky_json
```

That last one looks like how you'd write it if ClickHouse just understood JSON. Because now it does.

---

## Should You Migrate?

Yes.

6-7x faster queries. Same storage. Cleaner syntax. Easier ingestion. The native JSON type is still marked "experimental" but honestly, at this point, so is running observability on ClickHouse at all — and that hasn't stopped any of us.

If you're building logging or observability tools on ClickHouse and still using the string or pairwise hacks, you're leaving massive performance on the table. I wish I'd had this at Baselime. Would've saved some late nights.

Go migrate your stuff.

---

*100M rows from the [Bluesky JSON benchmark](https://github.com/ClickHouse/JSONBench/). Queries run on ClickHouse Cloud.*