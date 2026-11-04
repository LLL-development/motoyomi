export const LIST_DELIVERY = `#graphql
query ListDeliveryCustomizations($after: String) {
 deliveryCustomizations(first: 100, after: $after) {
  nodes { id shopifyFunction { handle appKey } }
  pageInfo { hasNextPage endCursor }
 }
}`;
export const CREATE_DELIVERY = `#graphql
mutation CreateDeliveryCustomization($input: DeliveryCustomizationInput!) {
 deliveryCustomizationCreate(deliveryCustomization: $input) {
  deliveryCustomization { id enabled }
  userErrors { code field message }
 }
}`;
export const UPDATE_DELIVERY = `#graphql
mutation UpdateDeliveryCustomization($id: ID!, $input: DeliveryCustomizationInput!) {
 deliveryCustomizationUpdate(id: $id, deliveryCustomization: $input) {
  deliveryCustomization { id enabled }
  userErrors { code field message }
 }
}`;
export const SET_METAFIELDS = `#graphql
mutation SetDeliveryConfiguration($metafields: [MetafieldsSetInput!]!) {
 metafieldsSet(metafields: $metafields) {
  metafields { id key }
  userErrors { code field message }
 }
}`;
