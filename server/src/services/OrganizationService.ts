import { Organization, IOrganization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { OrganizationInvitation } from '../models/OrganizationInvitation.js';
import { emailService } from './email.js';
import mongoose, { Types } from 'mongoose';
import crypto from 'crypto';

export class OrganizationService {
    /**
     * Create a new organization and assign the creator as the owner.
     */
    static async createOrganization(userId: string, data: { name: string; description?: string; slug: string }): Promise<IOrganization> {
        const organization = new Organization({
            ...data,
            ownerId: new Types.ObjectId(userId),
            members: [{
                userId: new Types.ObjectId(userId),
                role: 'owner',
                joinedAt: new Date()
            }],
            stats: {
                totalProjects: 0,
                totalStreamingMinutes: 0,
                totalCreditsConsumed: 0
            }
        });

        await organization.save();

        // Update user's current organization context
        await User.findByIdAndUpdate(userId, { currentOrganizationId: organization._id });

        return organization;
    }

    /**
     * Add a member to an organization.
     */
    static async addMember(organizationId: string, userId: string, role: 'producer' | 'editor' | 'synthesizer' = 'editor', invitedBy?: string): Promise<IOrganization> {
        const org = await Organization.findById(organizationId);
        if (!org) throw new Error('Organization not found');

        // Check limits
        if (org.members.length >= org.settings.maxMembers) {
            throw new Error('Organization seat limit reached');
        }

        // Check if already a member
        const isMember = org.members.some(m => m.userId.toString() === userId);
        if (isMember) throw new Error('User is already a member of this organization');

        org.members.push({
            userId: new Types.ObjectId(userId),
            role,
            joinedAt: new Date(),
            invitedBy: invitedBy ? new Types.ObjectId(invitedBy) : undefined
        });

        await org.save();
        return org;
    }

    /**
     * Remove a member from an organization.
     */
    static async removeMember(organizationId: string, userId: string): Promise<IOrganization> {
        const org = await Organization.findById(organizationId);
        if (!org) throw new Error('Organization not found');

        if (org.ownerId.toString() === userId) {
            throw new Error('Cannot remove the organization owner');
        }

        org.members = org.members.filter(m => m.userId.toString() !== userId);
        await org.save();

        // If user was currently in this org context, clear it
        await User.findOneAndUpdate(
            { _id: userId, currentOrganizationId: organizationId },
            { $unset: { currentOrganizationId: 1 } }
        );

        return org;
    }

    /**
     * Get all organizations for a specific user.
     */
    static async getUserOrganizations(userId: string): Promise<IOrganization[]> {
        return Organization.find({ 'members.userId': new Types.ObjectId(userId) });
    }

    /**
     * Associate a project with an organization.
     */
    static async associateProject(projectId: string, organizationId: string): Promise<void> {
        await Project.findByIdAndUpdate(projectId, { organizationId: new Types.ObjectId(organizationId) });

        // Update stats
        await Organization.findByIdAndUpdate(organizationId, { $inc: { 'stats.totalProjects': 1 } });
    }

    /**
     * Revoke project association from organization.
     */
    static async revokeProject(projectId: string, organizationId: string): Promise<void> {
        await Project.findByIdAndUpdate(projectId, { $unset: { organizationId: 1 } });
        await Organization.findByIdAndUpdate(organizationId, { $inc: { 'stats.totalProjects': -1 } });
    }

    /**
     * Invite a specialist via email.
     */
    static async inviteMember(organizationId: string, inviterId: string, email: string, role: 'producer' | 'editor' | 'synthesizer'): Promise<any> {
        const org = await Organization.findById(organizationId);
        if (!org) throw new Error('Organization not found');

        // Check if user is already a member
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser && org.members.some(m => m.userId.toString() === existingUser._id.toString())) {
            throw new Error('User is already a member');
        }

        const token = crypto.randomBytes(32).toString('hex');
        const invitation = new OrganizationInvitation({
            organizationId: new Types.ObjectId(organizationId),
            inviterId: new Types.ObjectId(inviterId),
            email: email.toLowerCase(),
            role,
            token
        });

        await invitation.save();

        // Send Email
        const inviteLink = `${process.env.PUBLIC_URL || 'http://localhost:5173'}/organization/join?token=${token}`;
        await emailService.sendEmail(
            email,
            `Join ${org.name} on AntStudio`,
            `<div style="font-family: Arial, sans-serif;">
                <h2>Tactical Onboarding Request</h2>
                <p>You have been invited to join <b>${org.name}</b> as a <b>${role.toUpperCase()}</b>.</p>
                <p>Click the link below to accept the commission:</p>
                <a href="${inviteLink}" style="padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Join Team</a>
            </div>`
        );

        return invitation;
    }

    /**
     * Accept a pending invitation.
     */
    static async acceptInvitation(userId: string, token: string): Promise<void> {
        const invite = await OrganizationInvitation.findOne({ token, status: 'pending' });
        if (!invite) throw new Error('Invalid or expired invitation');
        if (invite.expiresAt < new Date()) throw new Error('Invitation has expired');

        const user = await User.findById(userId);
        if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
            throw new Error('Identity mismatch: invitation is for another email address');
        }

        // Add to organization
        await this.addMember(invite.organizationId.toString(), userId, invite.role, invite.inviterId.toString());

        // Update invitation status
        invite.status = 'accepted';
        await invite.save();

        // Sync context
        await User.findByIdAndUpdate(userId, { currentOrganizationId: invite.organizationId });
    }

    static async getPendingInvitations(organizationId: string): Promise<any[]> {
        return OrganizationInvitation.find({ organizationId: new Types.ObjectId(organizationId), status: 'pending' });
    }

    /**
     * Revoke a pending invitation.
     */
    static async revokeInvitation(invitationId: string): Promise<void> {
        const result = await OrganizationInvitation.deleteOne({ _id: new Types.ObjectId(invitationId), status: 'pending' });
        if (result.deletedCount === 0) {
            throw new Error('Invitation not found or already processed');
        }
    }
}
