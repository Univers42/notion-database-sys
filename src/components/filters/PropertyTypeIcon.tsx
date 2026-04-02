/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PropertyTypeIcon.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:25 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:36:26 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Property type icon — maps property type to lucide icon
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import {
  Type, Hash, List, Tag, CircleDot, Calendar, CheckSquare, Users,
  Mail, Phone, Link, FileText, MapPin, Fingerprint, MousePointerClick,
  Clock, User, Sigma, GitBranch, ExternalLink, Database,
} from 'lucide-react';

export function PropertyTypeIcon({ type, className = 'w-4 h-4' }: Readonly<{ type: string; className?: string }>) {
  switch (type) {
    case 'title': case 'text': return <Type className={className} />;
    case 'number': return <Hash className={className} />;
    case 'select': return <List className={className} />;
    case 'multi_select': return <Tag className={className} />;
    case 'status': return <CircleDot className={className} />;
    case 'date': case 'due_date': return <Calendar className={className} />;
    case 'checkbox': return <CheckSquare className={className} />;
    case 'person': case 'user': case 'assigned_to': return <Users className={className} />;
    case 'email': return <Mail className={className} />;
    case 'phone': return <Phone className={className} />;
    case 'url': return <Link className={className} />;
    case 'files_media': return <FileText className={className} />;
    case 'place': return <MapPin className={className} />;
    case 'id': return <Fingerprint className={className} />;
    case 'button': return <MousePointerClick className={className} />;
    case 'created_time': case 'last_edited_time': return <Clock className={className} />;
    case 'created_by': case 'last_edited_by': return <User className={className} />;
    case 'formula': return <Sigma className={className} />;
    case 'rollup': return <GitBranch className={className} />;
    case 'relation': return <ExternalLink className={className} />;
    case 'custom': return <Database className={className} />;
    default: return <Type className={className} />;
  }
}
