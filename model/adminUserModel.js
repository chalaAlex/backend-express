const adminSchema = new mongoose.Schema({
  permissions: [String],
});

const Admin = User.discriminator("admin", adminSchema);
