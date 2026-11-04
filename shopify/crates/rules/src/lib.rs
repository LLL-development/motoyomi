#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn postal_normalization() {
        for raw in ["0012345", "001-2345", "００１－２３４５", "001 2345"] {
            assert_eq!(normalize_zip(Some(raw)), Some(12345));
        }
        for raw in ["", "123456", "12345678", "abc", "123x4567"] {
            assert_eq!(normalize_zip(Some(raw)), None);
        }
        assert_eq!(normalize_zip(None), None);
    }
    #[test]
    fn free_switch_both_directions_and_unknown() {
        let config =
            r#"{"v":1,"rules":[{"k":"ds","w":{"z":[1]},"h":{"c":["通常"]},"o":{"c":["離島"]}}]}"#;
        let options = vec![
            ("a".into(), Some("宅急便（通常）".into())),
            ("b".into(), Some("宅急便（離島）".into())),
        ];
        assert_eq!(
            delivery(
                config,
                &["1=1000000-1000099"],
                Some("JP"),
                Some("13"),
                Some("1000001"),
                &options
            ),
            vec!["a"]
        );
        assert_eq!(
            delivery(
                config,
                &["1=1000000-1000099"],
                Some("JP"),
                Some("13"),
                Some("1010001"),
                &options
            ),
            vec!["b"]
        );
        assert!(delivery(
            config,
            &["1=1000000-1000099"],
            Some("JP"),
            Some("13"),
            None,
            &options
        )
        .is_empty());
    }
    #[test]
    fn all_hidden_is_fail_open() {
        assert!(delivery(
            r#"{"v":1,"rules":[{"k":"dh","w":{"pf":["13"]},"m":{"c":["便"]}}]}"#,
            &[],
            Some("JP"),
            Some("JP-13"),
            None,
            &[("a".into(), Some("宅急便".into()))]
        )
        .is_empty());
    }
    #[test]
    fn invalid_config_is_fail_open() {
        for c in ["broken", r#"{"v":2,"rules":[]}"#] {
            assert!(delivery(c, &[], Some("JP"), Some("13"), None, &[]).is_empty());
        }
    }
    #[test]
    fn non_japan_does_not_apply() {
        assert!(delivery(
            r#"{"v":1,"rules":[{"k":"dh","w":{"pf":["13"]},"m":{"e":["通常"]}}]}"#,
            &[],
            Some("US"),
            Some("13"),
            None,
            &[("a".into(), Some("通常".into())), ("b".into(), None)]
        )
        .is_empty());
    }
}

use serde::Deserialize;
use unicode_normalization::UnicodeNormalization;
#[derive(Deserialize, Default)]
struct Config {
    v: u8,
    rules: Vec<Rule>,
}
#[derive(Deserialize, Default)]
struct Rule {
    k: String,
    #[serde(default)]
    w: Region,
    #[serde(default)]
    m: Names,
    #[serde(default)]
    h: Names,
    #[serde(default)]
    o: Names,
}
#[derive(Deserialize, Default)]
struct Region {
    #[serde(default)]
    pf: Vec<String>,
    #[serde(default)]
    z: Vec<u8>,
}
#[derive(Deserialize, Default)]
struct Names {
    #[serde(default)]
    c: Vec<String>,
    #[serde(default)]
    e: Vec<String>,
    #[serde(default)]
    p: Vec<String>,
}
impl Names {
    fn matches(&self, name: &str) -> bool {
        self.c.iter().any(|x| !x.is_empty() && name.contains(x))
            || self.e.iter().any(|x| name == x)
            || self.p.iter().any(|x| !x.is_empty() && name.starts_with(x))
    }
}
pub fn normalize_zip(raw: Option<&str>) -> Option<u32> {
    let text: String = raw?.nfkc().collect();
    if text.chars().any(|c| c.is_alphabetic()) {
        return None;
    }
    let digits: String = text.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() != 7 {
        return None;
    }
    digits.parse().ok()
}
pub fn province(raw: Option<&str>) -> Option<String> {
    let raw = raw?.trim();
    let numeric = raw.strip_prefix("JP-").unwrap_or(raw);
    if let Ok(n) = numeric.parse::<u8>() {
        if (1..=47).contains(&n) {
            return Some(format!("{n:02}"));
        }
    }
    let jp = [
        "北海道",
        "青森県",
        "岩手県",
        "宮城県",
        "秋田県",
        "山形県",
        "福島県",
        "茨城県",
        "栃木県",
        "群馬県",
        "埼玉県",
        "千葉県",
        "東京都",
        "神奈川県",
        "新潟県",
        "富山県",
        "石川県",
        "福井県",
        "山梨県",
        "長野県",
        "岐阜県",
        "静岡県",
        "愛知県",
        "三重県",
        "滋賀県",
        "京都府",
        "大阪府",
        "兵庫県",
        "奈良県",
        "和歌山県",
        "鳥取県",
        "島根県",
        "岡山県",
        "広島県",
        "山口県",
        "徳島県",
        "香川県",
        "愛媛県",
        "高知県",
        "福岡県",
        "佐賀県",
        "長崎県",
        "熊本県",
        "大分県",
        "宮崎県",
        "鹿児島県",
        "沖縄県",
    ];
    let en = [
        "Hokkaido",
        "Aomori",
        "Iwate",
        "Miyagi",
        "Akita",
        "Yamagata",
        "Fukushima",
        "Ibaraki",
        "Tochigi",
        "Gunma",
        "Saitama",
        "Chiba",
        "Tokyo",
        "Kanagawa",
        "Niigata",
        "Toyama",
        "Ishikawa",
        "Fukui",
        "Yamanashi",
        "Nagano",
        "Gifu",
        "Shizuoka",
        "Aichi",
        "Mie",
        "Shiga",
        "Kyoto",
        "Osaka",
        "Hyogo",
        "Nara",
        "Wakayama",
        "Tottori",
        "Shimane",
        "Okayama",
        "Hiroshima",
        "Yamaguchi",
        "Tokushima",
        "Kagawa",
        "Ehime",
        "Kochi",
        "Fukuoka",
        "Saga",
        "Nagasaki",
        "Kumamoto",
        "Oita",
        "Miyazaki",
        "Kagoshima",
        "Okinawa",
    ];
    jp.iter()
        .zip(en)
        .position(|(j, e)| raw == *j || raw.eq_ignore_ascii_case(e))
        .map(|n| format!("{:02}", n + 1))
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Limits {
    max_ranges: usize,
    max_rules_bytes: usize,
}
pub struct PreparedDelivery {
    config: Config,
    zones: std::collections::BTreeMap<u8, Vec<(u32, u32)>>,
}
impl PreparedDelivery {
    pub fn new(config: &str, chunks: &[&str]) -> Option<Self> {
        let limits: Limits =
            serde_json::from_str(include_str!("../../../config/free-limits.json")).ok()?;
        if config.len() > limits.max_rules_bytes
            || chunks.len() > 5
            || chunks.iter().any(|z| z.len() > 9000)
        {
            return None;
        }
        let config: Config = serde_json::from_str(config).ok()?;
        if config.v != 1 || config.rules.len() != 1 {
            return None;
        }
        let mut zones: std::collections::BTreeMap<u8, Vec<(u32, u32)>> =
            std::collections::BTreeMap::new();
        let mut count = 0;
        for part in chunks
            .iter()
            .filter(|x| !x.is_empty())
            .flat_map(|chunk| chunk.split(';'))
        {
            let (zone, values) = part.split_once('=')?;
            let zone = zone.parse::<u8>().ok()?;
            if zone > 7 {
                return None;
            }
            for value in values.split(',') {
                count += 1;
                if count > limits.max_ranges {
                    return None;
                }
                let (a, b) = value.split_once('-').unwrap_or((value, value));
                if a.len() != 7
                    || b.len() != 7
                    || !a.bytes().all(|x| x.is_ascii_digit())
                    || !b.bytes().all(|x| x.is_ascii_digit())
                {
                    return None;
                }
                let a = a.parse::<u32>().ok()?;
                let b = b.parse::<u32>().ok()?;
                if a > b {
                    return None;
                }
                zones.entry(zone).or_default().push((a, b));
            }
        }
        for values in zones.values_mut() {
            values.sort_unstable();
            let mut merged: Vec<(u32, u32)> = vec![];
            for (a, b) in values.iter().copied() {
                if let Some(last) = merged.last_mut() {
                    if a <= last.1.saturating_add(1) {
                        last.1 = last.1.max(b);
                        continue;
                    }
                }
                merged.push((a, b));
            }
            *values = merged;
        }
        if config
            .rules
            .iter()
            .any(|rule| rule.w.z.iter().any(|zone| !zones.contains_key(zone)))
        {
            return None;
        }
        Some(Self { config, zones })
    }
    fn region(&self, region: &Region, pf: Option<&str>, zip: Option<u32>) -> Option<bool> {
        let p = if region.pf.is_empty() {
            Some(false)
        } else {
            pf.map(|p| region.pf.iter().any(|x| x == p))
        };
        let z = if region.z.is_empty() {
            Some(false)
        } else {
            zip.map(|zip| {
                region.z.iter().any(|zone| {
                    self.zones.get(zone).is_some_and(|ranges| {
                        let i = ranges.partition_point(|(a, _)| *a <= zip);
                        i > 0 && zip <= ranges[i - 1].1
                    })
                })
            })
        };
        if p == Some(true) || z == Some(true) {
            Some(true)
        } else if p.is_some() && z.is_some() && (!region.pf.is_empty() || !region.z.is_empty()) {
            Some(false)
        } else {
            None
        }
    }
    pub fn delivery(
        &self,
        country: Option<&str>,
        pf: Option<&str>,
        zip: Option<&str>,
        options: &[(String, Option<String>)],
    ) -> Vec<String> {
        if country != Some("JP") {
            return vec![];
        }
        let pf = province(pf);
        let zip = normalize_zip(zip);
        let mut hidden = std::collections::BTreeSet::new();
        for rule in &self.config.rules {
            let matched = self.region(&rule.w, pf.as_deref(), zip);
            let names = match rule.k.as_str() {
                "dh" | "do" if matched == Some(true) => &rule.m,
                "ds" if matched == Some(true) => &rule.h,
                "ds" if matched == Some(false) => &rule.o,
                _ => continue,
            };
            let matches: Vec<_> = options
                .iter()
                .filter(|(_, name)| name.as_deref().is_some_and(|name| names.matches(name)))
                .map(|(handle, _)| handle.clone())
                .collect();
            if rule.k == "do" {
                if !matches.is_empty() {
                    for (handle, _) in options {
                        if !matches.contains(handle) {
                            hidden.insert(handle.clone());
                        }
                    }
                }
            } else {
                hidden.extend(matches);
            }
        }
        if hidden.len() >= options.len() {
            vec![]
        } else {
            hidden.into_iter().collect()
        }
    }
}
pub fn delivery(
    config: &str,
    zones: &[&str],
    country: Option<&str>,
    pf: Option<&str>,
    zip: Option<&str>,
    options: &[(String, Option<String>)],
) -> Vec<String> {
    PreparedDelivery::new(config, zones)
        .map(|p| p.delivery(country, pf, zip, options))
        .unwrap_or_default()
}

#[cfg(test)]
mod free_limits_tests {
    use super::*;
    #[test]
    fn rejects_401_ranges_and_corrupt_zone_data() {
        let rule =
            r#"{"v":1,"rules":[{"k":"ds","w":{"z":[1]},"h":{"e":["通常"]},"o":{"e":["離島"]}}]}"#;
        let options = vec![
            ("a".into(), Some("通常".into())),
            ("b".into(), Some("離島".into())),
        ];
        let ranges = format!(
            "1={}",
            (0..401)
                .map(|i| format!("{:07}", 1000000 + i))
                .collect::<Vec<_>>()
                .join(",")
        );
        assert!(delivery(
            rule,
            &[&ranges],
            Some("JP"),
            Some("13"),
            Some("1000001"),
            &options
        )
        .is_empty());
        assert!(delivery(
            rule,
            &["1=broken"],
            Some("JP"),
            Some("13"),
            Some("1000001"),
            &options
        )
        .is_empty());
    }
}

#[cfg(test)]
mod missing_zone_tests {
    use super::*;
    #[test]
    fn referenced_zone_missing_empty_or_invalid_never_means_outside() {
        let config =
            r#"{"v":1,"rules":[{"k":"ds","w":{"z":[1]},"h":{"e":["通常"]},"o":{"e":["離島"]}}]}"#;
        let options = vec![
            ("normal".into(), Some("通常".into())),
            ("island".into(), Some("離島".into())),
        ];
        for chunks in [
            vec![],
            vec![""],
            vec!["2=1000001"],
            vec!["1="],
            vec!["1=broken"],
        ] {
            assert!(
                delivery(
                    config,
                    &chunks,
                    Some("JP"),
                    Some("13"),
                    Some("1000001"),
                    &options
                )
                .is_empty(),
                "{chunks:?}"
            );
        }
    }
}
