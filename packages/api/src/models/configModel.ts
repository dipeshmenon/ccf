import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true },
  email: { type: String, required: true }, // Added email field
  GCP_USE_BILLING_DATA: { type: Boolean, required: true },
  GCP_USE_CARBON_FREE_ENERGY_PERCENTAGE: { type: Boolean, required: true },
  GOOGLE_APPLICATION_CREDENTIALS_URL: { type: String, required: true },
  GCP_BILLING_PROJECT_ID: { type: String, required: true },
  GCP_BILLING_PROJECT_NAME: { type: String, required: true },
  GCP_BIG_QUERY_TABLE: { type: String, required: true },
  __v: { type: Number, default: 0 }, // Added __v field with a default value
}, { collection: 'clientonboardings' });

const Config = mongoose.model('Config', configSchema);

export default Config;