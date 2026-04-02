/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   user.model.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:05:09 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:05:10 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Schema, model, type Document } from 'mongoose';
import bcrypt from 'bcrypt';
import type { User } from '@notion-db/types';

export interface UserDocument extends Omit<User, '_id'>, Document {
  comparePassword(candidate: string): Promise<boolean>;
}

const preferencesSchema = new Schema({
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  locale: { type: String, default: 'en' },
  startPage: { type: Schema.Types.ObjectId },
  sidebarCollapsed: { type: Boolean, default: false },
}, { _id: false });

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
  },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  avatar: String,
  passwordHash: { type: String, required: true, select: false },
  preferences: { type: preferencesSchema, default: () => ({}) },
  lastLoginAt: Date,
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Instance method: compare candidate password against stored hash
userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.index({ email: 1 }, { unique: true });

export const UserModel = model<UserDocument>('User', userSchema);
