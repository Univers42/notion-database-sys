/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PropTypeIcon.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:38 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:36:39 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import {
  Type, Hash, Calendar, CheckSquare, List, Tag, CircleDot,
  Mail, Phone, Link as LinkIcon, FileText, Users, Clock, User,
  MapPin, Fingerprint, MousePointerClick, Sigma, Database,
  GitBranch, ExternalLink, UserCheck, AlertTriangle
} from 'lucide-react';

export function PropTypeIcon({ type, className = 'w-3.5 h-3.5' }: { type: string; className?: string }) {
  switch (type) {
    case 'title': case 'text': return <Type className={className} />;
    case 'number': return <Hash className={className} />;
    case 'select': return <List className={className} />;
    case 'multi_select': return <Tag className={className} />;
    case 'status': return <CircleDot className={className} />;
    case 'date': return <Calendar className={className} />;
    case 'checkbox': return <CheckSquare className={className} />;
    case 'person': case 'user': return <Users className={className} />;
    case 'email': return <Mail className={className} />;
    case 'phone': return <Phone className={className} />;
    case 'url': return <LinkIcon className={className} />;
    case 'files_media': return <FileText className={className} />;
    case 'place': return <MapPin className={className} />;
    case 'id': return <Fingerprint className={className} />;
    case 'button': return <MousePointerClick className={className} />;
    case 'created_time': case 'last_edited_time': return <Clock className={className} />;
    case 'created_by': case 'last_edited_by': return <User className={className} />;
    case 'formula': return <Sigma className={className} />;
    case 'rollup': return <GitBranch className={className} />;
    case 'relation': return <ExternalLink className={className} />;
    case 'assigned_to': return <UserCheck className={className} />;
    case 'due_date': return <AlertTriangle className={className} />;
    case 'custom': return <Database className={className} />;
    default: return <Type className={className} />;
  }
}
