use serde::{Deserialize, Serialize};
use shopify_function::prelude::*;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Input {
    cart: Cart,
    delivery_customization: Customization,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Cart {
    delivery_groups: Vec<Group>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Group {
    delivery_address: Option<Address>,
    delivery_options: Vec<DeliveryOption>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Address {
    country_code: Option<String>,
    province_code: Option<String>,
    zip: Option<String>,
}
#[derive(Deserialize)]
struct DeliveryOption {
    handle: String,
    title: Option<String>,
}
#[derive(Deserialize)]
struct Metafield {
    value: String,
}
#[derive(Deserialize)]
struct Customization {
    rules: Option<Metafield>,
    zones0: Option<Metafield>,
    zones1: Option<Metafield>,
    zones2: Option<Metafield>,
    zones3: Option<Metafield>,
    zones4: Option<Metafield>,
}
#[derive(Serialize)]
struct Output {
    operations: Vec<Operation>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Operation {
    delivery_option_hide: Hide,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Hide {
    delivery_option_handle: String,
}
#[shopify_function]
fn cart_delivery_options_transform_run(input: Input) -> shopify_function::Result<Output> {
    let c = input.delivery_customization;
    let Some(rules) = c.rules else {
        return Ok(Output { operations: vec![] });
    };
    let zones = [c.zones0, c.zones1, c.zones2, c.zones3, c.zones4];
    let zones: Vec<&str> = zones.iter().flatten().map(|x| x.value.as_str()).collect();
    let Some(prepared) = motoyomi_rules::PreparedDelivery::new(&rules.value, &zones) else {
        return Ok(Output { operations: vec![] });
    };
    let mut operations = vec![];
    let mut cache: Vec<(
        (
            Option<String>,
            Option<String>,
            Option<String>,
            Vec<Option<String>>,
        ),
        Vec<usize>,
    )> = vec![];
    for group in input.cart.delivery_groups {
        let Some(address) = group.delivery_address else {
            continue;
        };
        let options: Vec<_> = group
            .delivery_options
            .into_iter()
            .map(|x| (x.handle, x.title))
            .collect();
        let key = (
            address.country_code.clone(),
            address.province_code.clone(),
            address.zip.clone(),
            options.iter().map(|x| x.1.clone()).collect(),
        );
        let hidden = if let Some((_, indices)) = cache.iter().find(|(k, _)| *k == key) {
            indices.clone()
        } else {
            let handles = prepared.delivery(
                address.country_code.as_deref(),
                address.province_code.as_deref(),
                address.zip.as_deref(),
                &options,
            );
            let indices: Vec<usize> = options
                .iter()
                .enumerate()
                .filter(|(_, x)| handles.contains(&x.0))
                .map(|(i, _)| i)
                .collect();
            cache.push((key, indices.clone()));
            indices
        };
        operations.extend(hidden.into_iter().map(|i| Operation {
            delivery_option_hide: Hide {
                delivery_option_handle: options[i].0.clone(),
            },
        }));
    }
    Ok(Output { operations })
}
