# AGENTS

This workspace contains production MongoDB schema definitions for the halal supply chain system.

Important schema source files:

- `schema-halal_supply_chain-certificates-standardJSON.json`
- `schema-halal_supply_chain-users-standardJSON.json`
- `schema-halal_supply_chain-products-standardJSON.json`
- `schema-halal_supply_chain-traceability_records-standardJSON.json`

Derived Mongoose model files:

- `HalalCertificate.js`
- `HalalUser.js`
- `HalalProduct.js`
- `HalalTraceabilityRecord.js`

Instructions for future agents:

- Treat the `schema-halal_*` JSON files in this folder as canonical production schema references for MongoDB.
- Preserve field names exactly when working with the production collections unless a deliberate migration is being performed.
- Do not rename, normalize, or camel-case these schema-derived fields without explicit approval, because they reflect the stored database shape.
- Keep nullable production fields compatible with existing records.
- Prefer additive changes over destructive schema edits.
- If these models are moved later, keep the mapping to the production collection names explicit.
