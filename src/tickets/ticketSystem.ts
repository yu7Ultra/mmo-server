/**
 * Customer Service Ticket System
 * 
 * Provides comprehensive ticket management for player support:
 * - In-game and web ticket submission
 * - Ticket assignment and priority management
 * - FAQ system for self-service
 * - Quick reply templates
 * - Complete audit trail
 */

import { getPrometheusMetrics } from '../instrumentation/prometheusMetrics';

// Ticket categories
export type TicketCategory = 
  | 'bug_report'
  | 'account_issue'
  | 'payment_issue'
  | 'gameplay_question'
  | 'report_player'
  | 'feature_request'
  | 'technical_support'
  | 'other';

// Ticket priority levels
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

// Ticket status
export type TicketStatus = 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';

// Ticket interface
export interface Ticket {
  id: string;
  playerId: string;
  playerName: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  attachments?: string[]; // URLs to screenshots, logs, etc.
  assignedTo?: string; // GM ID
  assignedToName?: string; // GM name
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
  closedAt?: number;
  responses: TicketResponse[];
  tags: string[];
  relatedTickets?: string[]; // Related ticket IDs
}

// Ticket response interface
export interface TicketResponse {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  isStaff: boolean;
  message: string;
  attachments?: string[];
  createdAt: number;
  internal?: boolean; // Staff-only notes
}

// FAQ entry
export interface FAQEntry {
  id: string;
  category: TicketCategory;
  question: string;
  answer: string;
  tags: string[];
  views: number;
  helpful: number;
  notHelpful: number;
  createdAt: number;
  updatedAt: number;
}

// Quick reply template
export interface QuickReplyTemplate {
  id: string;
  name: string;
  category: TicketCategory;
  message: string;
  tags: string[];
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Ticket System Manager
 * Singleton for centralized ticket management
 */
class TicketSystemManager {
  private static instance: TicketSystemManager;
  private tickets: Map<string, Ticket> = new Map();
  private faqs: Map<string, FAQEntry> = new Map();
  private templates: Map<string, QuickReplyTemplate> = new Map();
  private ticketCounter = 0;
  private responseCounter = 0;

  private constructor() {
    this.initializeDefaultFAQs();
    this.initializeDefaultTemplates();
  }

  static getInstance(): TicketSystemManager {
    if (!TicketSystemManager.instance) {
      TicketSystemManager.instance = new TicketSystemManager();
    }
    return TicketSystemManager.instance;
  }

  /**
   * Create a new ticket
   */
  createTicket(
    playerId: string,
    playerName: string,
    category: TicketCategory,
    subject: string,
    description: string,
    priority: TicketPriority = 'normal',
    attachments?: string[]
  ): Ticket {
    this.ticketCounter++;
    const ticketId = `TICKET-${Date.now()}-${this.ticketCounter}`;

    const ticket: Ticket = {
      id: ticketId,
      playerId,
      playerName,
      category,
      priority,
      status: 'open',
      subject,
      description,
      attachments,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      responses: [],
      tags: []
    };

    this.tickets.set(ticketId, ticket);

    // Update metrics
    const metrics = getPrometheusMetrics();
    metrics.tickets_created_total.inc({ category, priority });
    metrics.tickets_open.inc();

    console.log(`[Ticket System] Ticket created: ${ticketId} by ${playerName} (${category})`);

    return ticket;
  }

  /**
   * Add a response to a ticket
   */
  addResponse(
    ticketId: string,
    authorId: string,
    authorName: string,
    isStaff: boolean,
    message: string,
    attachments?: string[],
    internal: boolean = false
  ): TicketResponse | null {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      return null;
    }

    this.responseCounter++;
    const response: TicketResponse = {
      id: `RESPONSE-${Date.now()}-${this.responseCounter}`,
      ticketId,
      authorId,
      authorName,
      isStaff,
      message,
      attachments,
      createdAt: Date.now(),
      internal
    };

    ticket.responses.push(response);
    ticket.updatedAt = Date.now();

    // Update status if staff responded
    if (isStaff && ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    // Update metrics
    const metrics = getPrometheusMetrics();
    metrics.ticket_responses_total.inc({ is_staff: isStaff.toString() });

    console.log(`[Ticket System] Response added to ${ticketId} by ${authorName} (staff: ${isStaff})`);

    return response;
  }

  /**
   * Assign ticket to staff member
   */
  assignTicket(ticketId: string, staffId: string, staffName: string): boolean {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      return false;
    }

    ticket.assignedTo = staffId;
    ticket.assignedToName = staffName;
    ticket.updatedAt = Date.now();

    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    console.log(`[Ticket System] Ticket ${ticketId} assigned to ${staffName}`);
    return true;
  }

  /**
   * Update ticket status
   */
  updateTicketStatus(ticketId: string, status: TicketStatus): boolean {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      return false;
    }

    const oldStatus = ticket.status;
    ticket.status = status;
    ticket.updatedAt = Date.now();

    if (status === 'resolved') {
      ticket.resolvedAt = Date.now();
    }

    if (status === 'closed') {
      ticket.closedAt = Date.now();
    }

    // Update metrics
    const metrics = getPrometheusMetrics();
    if (oldStatus === 'open') {
      metrics.tickets_open.dec();
    }
    if (status === 'resolved') {
      metrics.tickets_resolved_total.inc({ category: ticket.category });
    }
    if (status === 'closed') {
      metrics.tickets_closed_total.inc({ category: ticket.category });
    }

    console.log(`[Ticket System] Ticket ${ticketId} status updated: ${oldStatus} -> ${status}`);
    return true;
  }

  /**
   * Update ticket priority
   */
  updateTicketPriority(ticketId: string, priority: TicketPriority): boolean {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      return false;
    }

    ticket.priority = priority;
    ticket.updatedAt = Date.now();

    console.log(`[Ticket System] Ticket ${ticketId} priority updated to ${priority}`);
    return true;
  }

  /**
   * Add tags to ticket
   */
  addTicketTags(ticketId: string, tags: string[]): boolean {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      return false;
    }

    ticket.tags = [...new Set([...ticket.tags, ...tags])];
    ticket.updatedAt = Date.now();

    return true;
  }

  /**
   * Get ticket by ID
   */
  getTicket(ticketId: string): Ticket | null {
    return this.tickets.get(ticketId) || null;
  }

  /**
   * Get tickets by player
   */
  getPlayerTickets(playerId: string): Ticket[] {
    return Array.from(this.tickets.values())
      .filter(t => t.playerId === playerId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get open tickets
   */
  getOpenTickets(limit: number = 50): Ticket[] {
    return Array.from(this.tickets.values())
      .filter(t => t.status === 'open' || t.status === 'in_progress')
      .sort((a, b) => {
        // Sort by priority first, then by creation time
        const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt - b.createdAt; // Older tickets first
      })
      .slice(0, limit);
  }

  /**
   * Get tickets by status
   */
  getTicketsByStatus(status: TicketStatus, limit: number = 50): Ticket[] {
    return Array.from(this.tickets.values())
      .filter(t => t.status === status)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  /**
   * Get tickets assigned to staff
   */
  getAssignedTickets(staffId: string): Ticket[] {
    return Array.from(this.tickets.values())
      .filter(t => t.assignedTo === staffId && t.status !== 'closed')
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Search tickets
   */
  searchTickets(query: string, category?: TicketCategory): Ticket[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.tickets.values())
      .filter(t => {
        if (category && t.category !== category) return false;
        return (
          t.subject.toLowerCase().includes(lowerQuery) ||
          t.description.toLowerCase().includes(lowerQuery) ||
          t.playerName.toLowerCase().includes(lowerQuery) ||
          t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get ticket statistics
   */
  getTicketStats() {
    const tickets = Array.from(this.tickets.values());
    
    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      in_progress: tickets.filter(t => t.status === 'in_progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
      by_category: {} as Record<TicketCategory, number>,
      by_priority: {} as Record<TicketPriority, number>,
      avg_resolution_time: 0,
      oldest_open_ticket: null as Ticket | null
    };

    // Category breakdown
    tickets.forEach(t => {
      stats.by_category[t.category] = (stats.by_category[t.category] || 0) + 1;
      stats.by_priority[t.priority] = (stats.by_priority[t.priority] || 0) + 1;
    });

    // Average resolution time
    const resolvedTickets = tickets.filter(t => t.resolvedAt);
    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((sum, t) => 
        sum + (t.resolvedAt! - t.createdAt), 0);
      stats.avg_resolution_time = totalTime / resolvedTickets.length;
    }

    // Oldest open ticket
    const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
    if (openTickets.length > 0) {
      stats.oldest_open_ticket = openTickets.reduce((oldest, current) => 
        current.createdAt < oldest.createdAt ? current : oldest);
    }

    return stats;
  }

  /**
   * FAQ management
   */
  createFAQ(
    category: TicketCategory,
    question: string,
    answer: string,
    tags: string[] = []
  ): FAQEntry {
    const faqId = `FAQ-${Date.now()}-${this.faqs.size + 1}`;
    const faq: FAQEntry = {
      id: faqId,
      category,
      question,
      answer,
      tags,
      views: 0,
      helpful: 0,
      notHelpful: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.faqs.set(faqId, faq);
    return faq;
  }

  getFAQs(category?: TicketCategory): FAQEntry[] {
    let faqs = Array.from(this.faqs.values());
    if (category) {
      faqs = faqs.filter(f => f.category === category);
    }
    return faqs.sort((a, b) => b.helpful - a.helpful);
  }

  searchFAQs(query: string): FAQEntry[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.faqs.values())
      .filter(f => 
        f.question.toLowerCase().includes(lowerQuery) ||
        f.answer.toLowerCase().includes(lowerQuery) ||
        f.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
      .sort((a, b) => b.helpful - a.helpful);
  }

  recordFAQView(faqId: string): void {
    const faq = this.faqs.get(faqId);
    if (faq) {
      faq.views++;
    }
  }

  voteFAQHelpful(faqId: string, helpful: boolean): void {
    const faq = this.faqs.get(faqId);
    if (faq) {
      if (helpful) {
        faq.helpful++;
      } else {
        faq.notHelpful++;
      }
    }
  }

  /**
   * Quick reply templates
   */
  createTemplate(
    name: string,
    category: TicketCategory,
    message: string,
    tags: string[] = []
  ): QuickReplyTemplate {
    const templateId = `TEMPLATE-${Date.now()}-${this.templates.size + 1}`;
    const template: QuickReplyTemplate = {
      id: templateId,
      name,
      category,
      message,
      tags,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.templates.set(templateId, template);
    return template;
  }

  getTemplates(category?: TicketCategory): QuickReplyTemplate[] {
    let templates = Array.from(this.templates.values());
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    return templates.sort((a, b) => b.usageCount - a.usageCount);
  }

  useTemplate(templateId: string): QuickReplyTemplate | null {
    const template = this.templates.get(templateId);
    if (template) {
      template.usageCount++;
      return template;
    }
    return null;
  }

  /**
   * Initialize default FAQs
   */
  private initializeDefaultFAQs() {
    this.createFAQ(
      'account_issue',
      'How do I reset my password?',
      'You can reset your password by clicking the "Forgot Password" link on the login screen. Enter your email address and follow the instructions sent to your email.',
      ['password', 'account', 'login']
    );

    this.createFAQ(
      'gameplay_question',
      'How do I level up faster?',
      'Complete quests, defeat monsters, and participate in events. Double XP events are announced server-wide!',
      ['leveling', 'experience', 'quests']
    );

    this.createFAQ(
      'technical_support',
      'The game is lagging, what should I do?',
      'Try lowering graphics settings, closing other applications, and checking your internet connection. If the issue persists, submit a bug report.',
      ['performance', 'lag', 'technical']
    );

    this.createFAQ(
      'payment_issue',
      'I made a purchase but didn\'t receive my items',
      'Please allow up to 15 minutes for purchases to process. If you still haven\'t received your items, create a ticket with your transaction ID.',
      ['payment', 'purchase', 'shop']
    );
  }

  /**
   * Initialize default quick reply templates
   */
  private initializeDefaultTemplates() {
    this.createTemplate(
      'Thank you for reporting',
      'bug_report',
      'Thank you for reporting this bug. Our development team is investigating the issue. We\'ll update you as soon as we have more information.',
      ['bug', 'thank you']
    );

    this.createTemplate(
      'Account verification required',
      'account_issue',
      'To proceed with your request, we need to verify your account. Please provide your character name and the email address associated with your account.',
      ['account', 'verification']
    );

    this.createTemplate(
      'Issue resolved',
      'technical_support',
      'We\'ve implemented a fix for the issue you reported. Please try again and let us know if you experience any further problems. Thank you for your patience!',
      ['resolved', 'fixed']
    );

    this.createTemplate(
      'Payment confirmation',
      'payment_issue',
      'We\'ve confirmed your payment. Your items should be available in your account now. If you still don\'t see them, please log out and log back in.',
      ['payment', 'resolved']
    );
  }
}

// Export singleton instance getter
export function getTicketSystem(): TicketSystemManager {
  return TicketSystemManager.getInstance();
}
