import mongoose from 'mongoose';

export async function initDB() {
  await mongoose.connect("mongodb+srv://tien:toilaso1@cluster0.inww0ej.mongodb.net/tien?retryWrites=true&w=majority");
  console.log(1)
}
