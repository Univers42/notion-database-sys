import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDatabaseStore } from '../store/useDatabaseStore';
import type { SchemaProperty, Page } from '../types/database';
import {
  X, HelpCircle, Send, ChevronRight, ArrowUpRight, Bug,
  Type, Hash, Calendar, CheckSquare, List, Tag, CircleDot,
  Mail, Phone, Link as LinkIcon, FileText, Users, Clock, User,
  MapPin, Fingerprint, MousePointerClick, Sigma, Database,
  GitBranch, ExternalLink, UserCheck, AlertTriangle
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// FORMULA FUNCTION CATALOG
// ═══════════════════════════════════════════════════════════════════════════════

interface FunctionDef {
  name: string;
  category: string;
  signature: string;
  description: string;
  returnType: string;
  examples: string[];
}

const FORMULA_FUNCTIONS: FunctionDef[] = [
  // ── Built-ins ──
  { name: 'true', category: 'Built-ins', signature: 'true', description: 'Boolean true value.', returnType: 'Boolean', examples: ['true'] },
  { name: 'false', category: 'Built-ins', signature: 'false', description: 'Boolean false value.', returnType: 'Boolean', examples: ['false'] },
  { name: 'not', category: 'Built-ins', signature: 'not(value)', description: 'Returns the logical negation of a boolean value.', returnType: 'Boolean', examples: ['not(true)', 'not(prop("Done"))'] },

  // ── General ──
  { name: 'if', category: 'General', signature: 'if(condition, valueIfTrue, valueIfFalse)', description: 'Returns one value if a condition is true, and another if false.', returnType: 'Any', examples: ['if(prop("Price") > 100, "Expensive", "Affordable")', 'if(empty(prop("Email")), "No email", prop("Email"))'] },
  { name: 'ifs', category: 'General', signature: 'ifs(cond1, val1, cond2, val2, ...)', description: 'Evaluates multiple conditions and returns the value of the first true condition.', returnType: 'Any', examples: ['ifs(prop("Score") >= 90, "A", prop("Score") >= 80, "B", true, "C")'] },
  { name: 'and', category: 'General', signature: 'and(value1, value2, ...)', description: 'Returns true only if all arguments are true.', returnType: 'Boolean', examples: ['and(prop("Active"), prop("Verified"))'] },
  { name: 'or', category: 'General', signature: 'or(value1, value2, ...)', description: 'Returns true if any argument is true.', returnType: 'Boolean', examples: ['or(prop("Admin"), prop("Editor"))'] },
  { name: 'empty', category: 'General', signature: 'empty(value)', description: 'Returns true if the value is empty, null, or an empty string.', returnType: 'Boolean', examples: ['empty(prop("Notes"))'] },
  { name: 'length', category: 'General', signature: 'length(text)', description: 'Returns the number of characters in a text string.', returnType: 'Number', examples: ['length(prop("Name"))', 'length("Hello")'] },
  { name: 'format', category: 'General', signature: 'format(value)', description: 'Converts any value to its text representation.', returnType: 'Text', examples: ['format(prop("Price"))', 'format(42)'] },
  { name: 'equal', category: 'General', signature: 'equal(value1, value2)', description: 'Returns true if two values are equal.', returnType: 'Boolean', examples: ['equal(prop("Status"), "Done")'] },
  { name: 'unequal', category: 'General', signature: 'unequal(value1, value2)', description: 'Returns true if two values are not equal.', returnType: 'Boolean', examples: ['unequal(prop("Type"), "Draft")'] },
  { name: 'let', category: 'General', signature: 'let(name, value, expression)', description: 'Defines a named variable for use in an expression.', returnType: 'Any', examples: ['let(x, prop("Price") * 1.2, if(x > 100, "Over budget", format(x)))'] },
  { name: 'lets', category: 'General', signature: 'lets(name1, val1, name2, val2, ..., expression)', description: 'Defines multiple named variables.', returnType: 'Any', examples: ['lets(tax, prop("Price") * 0.1, total, prop("Price") + tax, format(total))'] },

  // ── Text ──
  { name: 'substring', category: 'Text', signature: 'substring(text, start, end?)', description: 'Extracts a portion of a text string.', returnType: 'Text', examples: ['substring(prop("Name"), 0, 3)', 'substring("Hello World", 6)'] },
  { name: 'contains', category: 'Text', signature: 'contains(text, searchString)', description: 'Returns true if text contains the search string.', returnType: 'Boolean', examples: ['contains(prop("Email"), "@gmail")'] },
  { name: 'test', category: 'Text', signature: 'test(text, regex)', description: 'Tests if text matches a regular expression pattern.', returnType: 'Boolean', examples: ['test(prop("Phone"), "^\\\\+1")'] },
  { name: 'match', category: 'Text', signature: 'match(text, regex)', description: 'Returns the first match of a regex pattern.', returnType: 'Text', examples: ['match(prop("URL"), "https?://[^/]+")'] },
  { name: 'replace', category: 'Text', signature: 'replace(text, searchString, replacement)', description: 'Replaces the first occurrence of a string.', returnType: 'Text', examples: ['replace(prop("Name"), "Mr.", "Dr.")'] },
  { name: 'replaceAll', category: 'Text', signature: 'replaceAll(text, searchString, replacement)', description: 'Replaces all occurrences of a string.', returnType: 'Text', examples: ['replaceAll(prop("Notes"), "\\n", " ")'] },
  { name: 'lower', category: 'Text', signature: 'lower(text)', description: 'Converts text to lowercase.', returnType: 'Text', examples: ['lower(prop("Name"))'] },
  { name: 'upper', category: 'Text', signature: 'upper(text)', description: 'Converts text to uppercase.', returnType: 'Text', examples: ['upper(prop("Code"))'] },
  { name: 'trim', category: 'Text', signature: 'trim(text)', description: 'Removes leading and trailing whitespace.', returnType: 'Text', examples: ['trim(prop("Input"))'] },
  { name: 'repeat', category: 'Text', signature: 'repeat(text, count)', description: 'Repeats text a specified number of times.', returnType: 'Text', examples: ['repeat("★", prop("Rating"))'] },
  { name: 'padStart', category: 'Text', signature: 'padStart(text, targetLength, padString?)', description: 'Pads a string from the start with another string.', returnType: 'Text', examples: ['padStart(format(prop("ID")), 5, "0")'] },
  { name: 'padEnd', category: 'Text', signature: 'padEnd(text, targetLength, padString?)', description: 'Pads a string from the end with another string.', returnType: 'Text', examples: ['padEnd(prop("Code"), 10, ".")'] },
  { name: 'link', category: 'Text', signature: 'link(text, url)', description: 'Creates a hyperlink with display text.', returnType: 'Text', examples: ['link("Visit site", prop("URL"))'] },
  { name: 'style', category: 'Text', signature: 'style(text, styles...)', description: 'Applies formatting styles to text: "b" (bold), "i" (italic), "u" (underline), "s" (strikethrough), "c" (code).', returnType: 'Text', examples: ['style(prop("Name"), "b", "u")', 'style("Important", "b", "i")'] },
  { name: 'unstyle', category: 'Text', signature: 'unstyle(text)', description: 'Removes all formatting from styled text.', returnType: 'Text', examples: ['unstyle(prop("Formatted"))'] },
  { name: 'concat', category: 'Text', signature: 'concat(value1, value2, ...)', description: 'Joins multiple values into one text string.', returnType: 'Text', examples: ['concat(prop("First"), " ", prop("Last"))'] },
  { name: 'join', category: 'Text', signature: 'join(separator, value1, value2, ...)', description: 'Joins values with a separator between each.', returnType: 'Text', examples: ['join(", ", prop("Tag1"), prop("Tag2"))'] },
  { name: 'split', category: 'Text', signature: 'split(text, separator)', description: 'Splits text into a list using the separator.', returnType: 'List', examples: ['split(prop("Tags"), ", ")'] },

  // ── Number ──
  { name: 'formatNumber', category: 'Number', signature: 'formatNumber(number)', description: 'Formats a number with locale-appropriate separators.', returnType: 'Text', examples: ['formatNumber(prop("Revenue"))'] },
  { name: 'add', category: 'Number', signature: 'add(a, b)', description: 'Returns the sum of two numbers.', returnType: 'Number', examples: ['add(prop("Price"), prop("Tax"))'] },
  { name: 'subtract', category: 'Number', signature: 'subtract(a, b)', description: 'Returns the difference of two numbers.', returnType: 'Number', examples: ['subtract(prop("Revenue"), prop("Cost"))'] },
  { name: 'multiply', category: 'Number', signature: 'multiply(a, b)', description: 'Returns the product of two numbers.', returnType: 'Number', examples: ['multiply(prop("Qty"), prop("Price"))'] },
  { name: 'divide', category: 'Number', signature: 'divide(a, b)', description: 'Returns the quotient of two numbers.', returnType: 'Number', examples: ['divide(prop("Total"), prop("Count"))'] },
  { name: 'mod', category: 'Number', signature: 'mod(a, b)', description: 'Returns the remainder of dividing a by b.', returnType: 'Number', examples: ['mod(prop("ID"), 2)'] },
  { name: 'pow', category: 'Number', signature: 'pow(base, exponent)', description: 'Raises base to the power of exponent.', returnType: 'Number', examples: ['pow(prop("Growth"), 2)'] },
  { name: 'min', category: 'Number', signature: 'min(a, b, ...)', description: 'Returns the smallest of the given numbers.', returnType: 'Number', examples: ['min(prop("Budget"), prop("Actual"))'] },
  { name: 'max', category: 'Number', signature: 'max(a, b, ...)', description: 'Returns the largest of the given numbers.', returnType: 'Number', examples: ['max(prop("Score1"), prop("Score2"))'] },
  { name: 'sum', category: 'Number', signature: 'sum(list)', description: 'Returns the sum of all values in a list.', returnType: 'Number', examples: ['sum(prop("Scores"))'] },
  { name: 'median', category: 'Number', signature: 'median(list)', description: 'Returns the median value of a list.', returnType: 'Number', examples: ['median(prop("Ratings"))'] },
  { name: 'mean', category: 'Number', signature: 'mean(list)', description: 'Returns the arithmetic mean of a list.', returnType: 'Number', examples: ['mean(prop("Scores"))'] },
  { name: 'abs', category: 'Number', signature: 'abs(number)', description: 'Returns the absolute value of a number.', returnType: 'Number', examples: ['abs(prop("Balance"))'] },
  { name: 'round', category: 'Number', signature: 'round(number)', description: 'Rounds a number to the nearest integer.', returnType: 'Number', examples: ['round(prop("Average"))'] },
  { name: 'ceil', category: 'Number', signature: 'ceil(number)', description: 'Rounds a number up to the next integer.', returnType: 'Number', examples: ['ceil(prop("Qty"))'] },
  { name: 'floor', category: 'Number', signature: 'floor(number)', description: 'Rounds a number down to the previous integer.', returnType: 'Number', examples: ['floor(prop("Discount"))'] },
  { name: 'sqrt', category: 'Number', signature: 'sqrt(number)', description: 'Returns the square root of a number.', returnType: 'Number', examples: ['sqrt(prop("Area"))'] },
  { name: 'cbrt', category: 'Number', signature: 'cbrt(number)', description: 'Returns the cube root of a number.', returnType: 'Number', examples: ['cbrt(27)'] },
  { name: 'exp', category: 'Number', signature: 'exp(number)', description: 'Returns e raised to the given power.', returnType: 'Number', examples: ['exp(1)'] },
  { name: 'ln', category: 'Number', signature: 'ln(number)', description: 'Returns the natural logarithm (base e).', returnType: 'Number', examples: ['ln(prop("Growth"))'] },
  { name: 'log10', category: 'Number', signature: 'log10(number)', description: 'Returns the base-10 logarithm.', returnType: 'Number', examples: ['log10(1000)'] },
  { name: 'log2', category: 'Number', signature: 'log2(number)', description: 'Returns the base-2 logarithm.', returnType: 'Number', examples: ['log2(8)'] },
  { name: 'sign', category: 'Number', signature: 'sign(number)', description: 'Returns 1, 0, or -1 indicating the sign of a number.', returnType: 'Number', examples: ['sign(prop("Profit"))'] },
  { name: 'pi', category: 'Number', signature: 'pi()', description: 'Returns the mathematical constant π (approx 3.14159).', returnType: 'Number', examples: ['pi()'] },
  { name: 'e', category: 'Number', signature: 'e()', description: 'Returns Euler\'s number (approx 2.71828).', returnType: 'Number', examples: ['e()'] },
  { name: 'toNumber', category: 'Number', signature: 'toNumber(value)', description: 'Converts a text or boolean value to a number.', returnType: 'Number', examples: ['toNumber(prop("Amount"))', 'toNumber("42")'] },

  // ── Date ──
  { name: 'now', category: 'Date', signature: 'now()', description: 'Returns the current date and time.', returnType: 'Date', examples: ['now()'] },
  { name: 'today', category: 'Date', signature: 'today()', description: 'Returns the current date without the time component.', returnType: 'Date', examples: ['today()'] },
  { name: 'minute', category: 'Date', signature: 'minute(date)', description: 'Extracts the minute (0–59) from a date.', returnType: 'Number', examples: ['minute(prop("Created"))'] },
  { name: 'hour', category: 'Date', signature: 'hour(date)', description: 'Extracts the hour (0–23) from a date.', returnType: 'Number', examples: ['hour(prop("Created"))'] },
  { name: 'day', category: 'Date', signature: 'day(date)', description: 'Extracts the day of the week (0=Sun, 6=Sat).', returnType: 'Number', examples: ['day(prop("Date"))'] },
  { name: 'date', category: 'Date', signature: 'date(date)', description: 'Extracts the day of the month (1–31).', returnType: 'Number', examples: ['date(prop("Date"))'] },
  { name: 'week', category: 'Date', signature: 'week(date)', description: 'Returns the ISO week number of the year.', returnType: 'Number', examples: ['week(prop("Date"))'] },
  { name: 'month', category: 'Date', signature: 'month(date)', description: 'Extracts the month (0–11) from a date.', returnType: 'Number', examples: ['month(prop("Date"))'] },
  { name: 'year', category: 'Date', signature: 'year(date)', description: 'Extracts the year from a date.', returnType: 'Number', examples: ['year(prop("Date"))'] },
  { name: 'dateAdd', category: 'Date', signature: 'dateAdd(date, amount, unit)', description: 'Adds a time amount to a date. Units: "years", "months", "weeks", "days", "hours", "minutes".', returnType: 'Date', examples: ['dateAdd(prop("Start"), 30, "days")', 'dateAdd(now(), 1, "hours")'] },
  { name: 'dateSubtract', category: 'Date', signature: 'dateSubtract(date, amount, unit)', description: 'Subtracts a time amount from a date.', returnType: 'Date', examples: ['dateSubtract(prop("Due"), 7, "days")'] },
  { name: 'dateBetween', category: 'Date', signature: 'dateBetween(date1, date2, unit)', description: 'Returns the time between two dates in the specified unit.', returnType: 'Number', examples: ['dateBetween(prop("End"), prop("Start"), "days")', 'dateBetween(now(), prop("Created"), "hours")'] },
  { name: 'dateRange', category: 'Date', signature: 'dateRange(start, end)', description: 'Creates a date range from start to end.', returnType: 'DateRange', examples: ['dateRange(prop("Start"), prop("End"))'] },
  { name: 'dateStart', category: 'Date', signature: 'dateStart(dateRange)', description: 'Returns the start date of a date range.', returnType: 'Date', examples: ['dateStart(prop("Period"))'] },
  { name: 'dateEnd', category: 'Date', signature: 'dateEnd(dateRange)', description: 'Returns the end date of a date range.', returnType: 'Date', examples: ['dateEnd(prop("Period"))'] },
  { name: 'timestamp', category: 'Date', signature: 'timestamp(date)', description: 'Returns the Unix timestamp (ms) for a date.', returnType: 'Number', examples: ['timestamp(now())'] },
  { name: 'fromTimestamp', category: 'Date', signature: 'fromTimestamp(ms)', description: 'Creates a date from a Unix timestamp (ms).', returnType: 'Date', examples: ['fromTimestamp(1700000000000)'] },
  { name: 'formatDate', category: 'Date', signature: 'formatDate(date, format)', description: 'Formats a date as text using a format string (e.g. "YYYY-MM-DD").', returnType: 'Text', examples: ['formatDate(prop("Date"), "MMMM D, YYYY")', 'formatDate(now(), "HH:mm")'] },
  { name: 'parseDate', category: 'Date', signature: 'parseDate(text)', description: 'Parses a text string into a date.', returnType: 'Date', examples: ['parseDate("2024-01-15")'] },

  // ── People ──
  { name: 'name', category: 'People', signature: 'name(person)', description: 'Returns the display name of a person.', returnType: 'Text', examples: ['name(prop("Created by"))'] },
  { name: 'email', category: 'People', signature: 'email(person)', description: 'Returns the email of a person.', returnType: 'Text', examples: ['email(prop("Assigned to"))'] },

  // ── List ──
  { name: 'at', category: 'List', signature: 'at(list, index)', description: 'Returns the element at the specified index.', returnType: 'Any', examples: ['at(prop("Tags"), 0)'] },
  { name: 'first', category: 'List', signature: 'first(list)', description: 'Returns the first element of a list.', returnType: 'Any', examples: ['first(prop("Tags"))'] },
  { name: 'last', category: 'List', signature: 'last(list)', description: 'Returns the last element of a list.', returnType: 'Any', examples: ['last(prop("Tags"))'] },
  { name: 'slice', category: 'List', signature: 'slice(list, start, end?)', description: 'Returns a portion of a list.', returnType: 'List', examples: ['slice(prop("Tags"), 0, 3)'] },
  { name: 'sort', category: 'List', signature: 'sort(list)', description: 'Sorts a list in ascending order.', returnType: 'List', examples: ['sort(prop("Scores"))'] },
  { name: 'reverse', category: 'List', signature: 'reverse(list)', description: 'Reverses the order of elements in a list.', returnType: 'List', examples: ['reverse(prop("Items"))'] },
  { name: 'unique', category: 'List', signature: 'unique(list)', description: 'Returns unique values from a list.', returnType: 'List', examples: ['unique(prop("Tags"))'] },
  { name: 'includes', category: 'List', signature: 'includes(list, value)', description: 'Returns true if the list contains the value.', returnType: 'Boolean', examples: ['includes(prop("Tags"), "Urgent")'] },
  { name: 'find', category: 'List', signature: 'find(list, condition)', description: 'Returns the first element matching the condition.', returnType: 'Any', examples: ['find(prop("Items"), current > 10)'] },
  { name: 'findIndex', category: 'List', signature: 'findIndex(list, condition)', description: 'Returns the index of the first element matching the condition.', returnType: 'Number', examples: ['findIndex(prop("Scores"), current > 90)'] },
  { name: 'filter', category: 'List', signature: 'filter(list, condition)', description: 'Returns elements that match the condition.', returnType: 'List', examples: ['filter(prop("Scores"), current >= 80)'] },
  { name: 'some', category: 'List', signature: 'some(list, condition)', description: 'Returns true if any element matches.', returnType: 'Boolean', examples: ['some(prop("Tags"), current == "Urgent")'] },
  { name: 'every', category: 'List', signature: 'every(list, condition)', description: 'Returns true if all elements match.', returnType: 'Boolean', examples: ['every(prop("Scores"), current > 50)'] },
  { name: 'map', category: 'List', signature: 'map(list, expression)', description: 'Transforms each element using an expression.', returnType: 'List', examples: ['map(prop("Prices"), current * 1.1)'] },
  { name: 'flat', category: 'List', signature: 'flat(list)', description: 'Flattens nested lists by one level.', returnType: 'List', examples: ['flat(prop("Nested"))'] },
  { name: 'count', category: 'List', signature: 'count(list)', description: 'Returns the number of elements in a list.', returnType: 'Number', examples: ['count(prop("Tags"))'] },

  // ── Special ──
  { name: 'id', category: 'Special', signature: 'id()', description: 'Returns the unique page ID.', returnType: 'Text', examples: ['id()'] },
];

const FUNCTION_CATEGORIES = ['Built-ins', 'General', 'Text', 'Number', 'Date', 'People', 'List', 'Special'];

// ─── RETURN TYPE BADGE COLORS ────────────────────────────────────────────────

function getReturnTypeBadge(returnType: string) {
  const map: Record<string, { bg: string; text: string }> = {
    'Number': { bg: 'bg-accent-muted', text: 'text-accent-text' },
    'Text': { bg: 'bg-success-surface-muted', text: 'text-success-text-bold' },
    'Boolean': { bg: 'bg-amber-surface-muted', text: 'text-amber-text-bold' },
    'Date': { bg: 'bg-purple-surface-muted', text: 'text-purple-text-bold' },
    'DateRange': { bg: 'bg-purple-surface-muted', text: 'text-purple-text-bold' },
    'List': { bg: 'bg-cyan-surface-muted', text: 'text-cyan-text-bold' },
    'Any': { bg: 'bg-surface-tertiary', text: 'text-ink-body-light' },
  };
  const colors = map[returnType] || map['Any'];
  return (
    <span className={`ml-2 shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors.bg} ${colors.text}`}>
      {returnType}
    </span>
  );
}

// ─── PROPERTY TYPE → RETURN TYPE ─────────────────────────────────────────────

function propReturnType(type: string): string {
  switch (type) {
    case 'number': return 'Number';
    case 'checkbox': return 'Boolean';
    case 'date': case 'due_date': case 'created_time': case 'last_edited_time': return 'Date';
    case 'person': case 'user': case 'assigned_to': case 'created_by': case 'last_edited_by': return 'Person';
    case 'multi_select': case 'relation': return 'List';
    default: return 'Text';
  }
}

function PropTypeIcon({ type, className = 'w-3.5 h-3.5' }: { type: string; className?: string }) {
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

// ═══════════════════════════════════════════════════════════════════════════════
// FORMULA EDITOR PANEL
// ═══════════════════════════════════════════════════════════════════════════════

interface FormulaEditorPanelProps {
  databaseId: string;
  propertyId: string;
  onClose: () => void;
}

export function FormulaEditorPanel({ databaseId, propertyId, onClose }: FormulaEditorPanelProps) {
  const { databases, updateProperty, resolveFormula, getPagesForView, activeViewId, views, pages: storePages } = useDatabaseStore();
  const db = databases[databaseId];
  const property = db?.properties[propertyId];

  const [expression, setExpression] = useState(property?.formulaConfig?.expression || '');
  const [aiPrompt, setAiPrompt] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'property'; prop: SchemaProperty } | { type: 'function'; fn: FunctionDef } | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Properties', ...FUNCTION_CATEGORIES]));
  const [previewPageId, setPreviewPageId] = useState<string | null>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Available pages for preview ──
  const previewPages = useMemo(() => {
    if (!activeViewId) return [];
    const view = views[activeViewId];
    if (!view || view.databaseId !== databaseId) return [];
    const allPages = getPagesForView(view.id);
    return allPages.slice(0, 20);
  }, [activeViewId, views, databaseId, getPagesForView]);

  useEffect(() => {
    if (previewPages.length > 0 && !previewPageId) {
      setPreviewPageId(previewPages[0].id);
    }
  }, [previewPages, previewPageId]);

  // ── Database properties (excluding this formula) ──
  const dbProperties = useMemo(() => {
    if (!db) return [];
    return Object.values(db.properties).filter(p => p.id !== propertyId);
  }, [db, propertyId]);

  // ── Filtered sidebar items ──
  const filteredProperties = useMemo(() => {
    if (!sidebarSearch) return dbProperties;
    const q = sidebarSearch.toLowerCase();
    return dbProperties.filter(p => p.name.toLowerCase().includes(q));
  }, [dbProperties, sidebarSearch]);

  const filteredFunctions = useMemo(() => {
    if (!sidebarSearch) return FORMULA_FUNCTIONS;
    const q = sidebarSearch.toLowerCase();
    return FORMULA_FUNCTIONS.filter(f => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
  }, [sidebarSearch]);

  // ── Preview result ──
  const previewResult = useMemo(() => {
    if (!expression.trim()) return { value: null, type: '', error: false };
    if (!previewPageId || !storePages[previewPageId]) return { value: null, type: '', error: false };

    try {
      const result = resolveFormula(databaseId, storePages[previewPageId], expression);
      if (result === '#ERROR') return { value: '#ERROR', type: 'Error', error: true };
      const type = typeof result === 'number' ? 'Number' : typeof result === 'boolean' ? 'Boolean' : typeof result === 'string' ? 'Text' : 'Any';
      return { value: result, type, error: false };
    } catch {
      return { value: '#ERROR', type: 'Error', error: true };
    }
  }, [expression, previewPageId, databaseId, storePages, resolveFormula]);

  // ── Insert text at cursor ──
  const insertAtCursor = useCallback((text: string) => {
    const el = editorRef.current;
    if (!el) { setExpression(prev => prev + text); return; }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = expression.slice(0, start);
    const after = expression.slice(end);
    const newExpr = before + text + after;
    setExpression(newExpr);

    // Restore cursor position after the inserted text
    requestAnimationFrame(() => {
      el.focus();
      const newPos = start + text.length;
      el.setSelectionRange(newPos, newPos);
    });
  }, [expression]);

  // ── Insert a property reference ──
  const insertProperty = useCallback((prop: SchemaProperty) => {
    insertAtCursor(`prop("${prop.name}")`);
  }, [insertAtCursor]);

  // ── Insert a function ──
  const insertFunction = useCallback((fn: FunctionDef) => {
    // For zero-arg functions, insert "name()"
    // For others, insert "name(" so user can fill in args
    const isConstant = !fn.signature.includes('(');
    if (isConstant) {
      insertAtCursor(fn.name);
    } else {
      const hasArgs = fn.signature.includes(',') || (fn.signature.includes('(') && !fn.signature.endsWith('()'));
      insertAtCursor(hasArgs ? `${fn.name}(` : `${fn.name}()`);
    }
  }, [insertAtCursor]);

  // ── Save formula ──
  const saveFormula = useCallback(() => {
    updateProperty(databaseId, propertyId, {
      formulaConfig: { expression: expression.trim() },
    });
    onClose();
  }, [databaseId, propertyId, expression, updateProperty, onClose]);

  // ── Toggle category ──
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // ── Get page title for preview selector ──
  const getPageTitle = (page: Page) => {
    if (!db) return 'Untitled';
    const titleProp = db.properties[db.titlePropertyId];
    if (titleProp) {
      return page.properties[titleProp.id] || 'Untitled';
    }
    return 'Untitled';
  };

  // ── Close on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // ── Close on Escape ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!db || !property) return null;

  // ═══ RENDER ════════════════════════════════════════════════

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim-light backdrop-blur-[2px]">
      <div
        ref={panelRef}
        className="w-[920px] max-w-[95vw] h-[600px] max-h-[85vh] bg-surface-primary rounded-2xl shadow-2xl border border-line flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-line-light bg-surface-secondary-soft">
          <div className="flex items-center gap-2.5">
            <Sigma className="w-4.5 h-4.5 text-ink-secondary" />
            <h2 className="text-sm font-semibold text-ink-strong">Edit formula</h2>
            <span className="text-xs text-ink-muted">— {property.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              className="p-1.5 rounded-md text-ink-muted hover:text-hover-text hover:bg-hover-surface2 transition-colors"
              title="Formula help"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-ink-muted hover:text-hover-text hover:bg-hover-surface2 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ═══ BODY ═══ */}
        <div className="flex flex-1 min-h-0">
          {/* ─── SIDEBAR: insertable items ─── */}
          <div className="w-[240px] shrink-0 border-r border-line-light flex flex-col bg-surface-secondary-soft5">
            {/* Search */}
            <div className="p-2 border-b border-line-light">
              <input
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-surface-primary rounded-md border border-line outline-none focus:border-focus-border placeholder:text-placeholder transition-colors"
                placeholder="Search properties & functions…"
              />
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto text-[13px]">
              {/* Properties */}
              {filteredProperties.length > 0 && (
                <div className="py-1">
                  <button
                    onClick={() => toggleCategory('Properties')}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-ink-muted uppercase tracking-wider hover:text-hover-text transition-colors"
                  >
                    <ChevronRight className={`w-3 h-3 transition-transform duration-150 ${expandedCategories.has('Properties') ? 'rotate-90' : ''}`} />
                    Properties
                    <span className="text-[10px] font-normal tabular-nums ml-auto">{filteredProperties.length}</span>
                  </button>
                  {expandedCategories.has('Properties') && (
                    <div className="px-1">
                      {filteredProperties.map(prop => (
                        <button
                          key={prop.id}
                          onClick={() => insertProperty(prop)}
                          onMouseEnter={() => setSelectedItem({ type: 'property', prop })}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-hover-surface-white hover:shadow-sm text-ink-body group transition-all"
                        >
                          <PropTypeIcon type={prop.type} className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                          <span className="truncate text-left flex-1">{prop.name}</span>
                          <ArrowUpRight className="w-3 h-3 text-ink-disabled opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Function categories */}
              {FUNCTION_CATEGORIES.map(cat => {
                const fns = filteredFunctions.filter(f => f.category === cat);
                if (fns.length === 0) return null;
                return (
                  <div key={cat} className="py-1">
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-ink-muted uppercase tracking-wider hover:text-hover-text transition-colors"
                    >
                      <ChevronRight className={`w-3 h-3 transition-transform duration-150 ${expandedCategories.has(cat) ? 'rotate-90' : ''}`} />
                      {cat}
                      <span className="text-[10px] font-normal tabular-nums ml-auto">{fns.length}</span>
                    </button>
                    {expandedCategories.has(cat) && (
                      <div className="px-1">
                        {fns.map(fn => (
                          <button
                            key={fn.name}
                            onClick={() => insertFunction(fn)}
                            onMouseEnter={() => setSelectedItem({ type: 'function', fn })}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-hover-surface-white hover:shadow-sm text-ink-body group transition-all"
                          >
                            <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold text-ink-muted shrink-0 font-mono">ƒ</span>
                            <span className="truncate text-left flex-1 font-mono text-[12px]">
                              {fn.signature.includes('(') ? `${fn.name}()` : fn.name}
                            </span>
                            <ArrowUpRight className="w-3 h-3 text-ink-disabled opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── MAIN AREA ─── */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* AI prompt bar */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-secondary rounded-lg border border-line focus-within:border-focus-border focus-within:ring-1 focus-within:ring-focus-ring transition-all">
                <Sigma className="w-4 h-4 text-ink-muted shrink-0" />
                <input
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-placeholder"
                  placeholder="Write, fix, or explain a formula…"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && aiPrompt.trim()) {
                      // AI is a placeholder: just insert the text as a formula
                      setExpression(aiPrompt.trim());
                      setAiPrompt('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (aiPrompt.trim()) {
                      setExpression(aiPrompt.trim());
                      setAiPrompt('');
                    }
                  }}
                  className={`p-1 rounded-md transition-colors ${aiPrompt.trim() ? 'text-accent-text-soft hover:bg-hover-accent-soft' : 'text-ink-disabled cursor-default'}`}
                  disabled={!aiPrompt.trim()}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Formula editor */}
            <div className="flex-1 px-4 pb-2 min-h-0 flex flex-col">
              <div className="flex-1 relative rounded-lg border border-line bg-surface-primary overflow-hidden focus-within:border-focus-border focus-within:ring-1 focus-within:ring-focus-ring transition-all">
                <textarea
                  ref={editorRef}
                  value={expression}
                  onChange={e => setExpression(e.target.value)}
                  className="w-full h-full resize-none p-3 text-sm font-mono text-ink leading-relaxed outline-none placeholder:text-placeholder"
                  placeholder="Your formula"
                  spellCheck={false}
                  onKeyDown={e => {
                    // Tab inserts 2 spaces
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      insertAtCursor('  ');
                    }
                    // Ctrl/Cmd+Enter to save
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      saveFormula();
                    }
                  }}
                />
              </div>
            </div>

            {/* Preview section */}
            <div className="px-4 pb-3 space-y-2">
              {/* Preview toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Preview with</span>
                  <select
                    value={previewPageId || ''}
                    onChange={e => setPreviewPageId(e.target.value)}
                    className="text-xs px-2 py-1 bg-surface-secondary border border-line rounded-md outline-none focus:border-focus-border max-w-[200px] truncate text-ink-body"
                  >
                    {previewPages.map(page => (
                      <option key={page.id} value={page.id}>{getPageTitle(page)}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setDebugMode(!debugMode)}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${debugMode ? 'bg-amber-surface text-amber-text-bold border border-amber-border' : 'text-ink-muted hover:text-hover-text hover:bg-hover-surface'}`}
                >
                  <Bug className="w-3 h-3" />
                  Debug
                </button>
              </div>

              {/* Preview output */}
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${previewResult.error ? 'bg-danger-surface-soft border-danger-border' : expression.trim() ? 'bg-surface-secondary border-line' : 'bg-surface-secondary-soft border-line-light'}`}>
                <div className="flex-1 min-w-0">
                  {expression.trim() ? (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono truncate ${previewResult.error ? 'text-danger-text-soft' : 'text-ink'}`}>
                        {previewResult.value != null ? String(previewResult.value) : <span className="text-ink-muted italic">Empty</span>}
                      </span>
                      {previewResult.type && getReturnTypeBadge(previewResult.type)}
                    </div>
                  ) : (
                    <span className="text-xs text-ink-muted italic">Enter a formula to see preview</span>
                  )}
                </div>
              </div>

              {/* Debug info */}
              {debugMode && expression.trim() && (
                <div className="p-2.5 rounded-lg bg-surface-inverse text-[11px] font-mono text-ink-disabled space-y-1 max-h-[100px] overflow-y-auto">
                  <div><span className="text-ink-secondary">expression:</span> {expression}</div>
                  <div><span className="text-ink-secondary">resolved:</span> {(() => {
                    try {
                      if (!previewPageId || !storePages[previewPageId]) return '(no page)';
                      // Show how prop() references resolve
                      const page = storePages[previewPageId];
                      return expression.replace(/prop\("([^"]+)"\)/g, (_m, pName) => {
                        const schemaProp = Object.values(db.properties).find(p => p.name === pName);
                        if (!schemaProp) return `<unknown:${pName}>`;
                        const val = page.properties[schemaProp.id];
                        return JSON.stringify(val);
                      });
                    } catch { return '(resolve error)'; }
                  })()}</div>
                  <div><span className="text-ink-secondary">result:</span> <span className={previewResult.error ? 'text-danger-text-faint' : 'text-success-text-faint'}>{JSON.stringify(previewResult.value)}</span></div>
                  <div><span className="text-ink-secondary">type:</span> {previewResult.type || '—'}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-line-light bg-surface-secondary-soft">
              <span className="text-[11px] text-ink-muted">
                <kbd className="px-1 py-0.5 bg-surface-muted-soft2 rounded text-[10px] font-mono">⌘ Enter</kbd> to save
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-ink-body-light hover:text-hover-text-bolder hover:bg-hover-surface2 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveFormula}
                  className="px-4 py-1.5 text-xs font-medium text-ink-inverse bg-accent hover:bg-hover-accent rounded-md transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>

          {/* ─── RIGHT PANEL: Documentation ─── */}
          <div className="w-[240px] shrink-0 border-l border-line-light bg-surface-secondary-soft5 flex flex-col overflow-hidden">
            {selectedItem ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {selectedItem.type === 'property' ? (
                  <>
                    {/* Property documentation */}
                    <div className="flex items-center gap-2">
                      <PropTypeIcon type={selectedItem.prop.type} className="w-4 h-4 text-ink-secondary" />
                      <span className="text-sm font-semibold text-ink-strong truncate">{selectedItem.prop.name}</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[11px] font-semibold text-ink-muted uppercase">Type</span>
                        <p className="text-xs text-ink-body-light mt-0.5">{selectedItem.prop.type.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-ink-muted uppercase">Returns</span>
                        <div className="mt-0.5">{getReturnTypeBadge(propReturnType(selectedItem.prop.type))}</div>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-ink-muted uppercase">Usage</span>
                        <div className="mt-1 p-2 rounded-md bg-surface-primary border border-line font-mono text-xs text-ink-body">
                          prop("{selectedItem.prop.name}")
                        </div>
                      </div>
                      {/* Example formulas */}
                      <div>
                        <span className="text-[11px] font-semibold text-ink-muted uppercase">Examples</span>
                        <div className="mt-1 space-y-1.5">
                          {selectedItem.prop.type === 'number' && (
                            <>
                              <ExampleBlock code={`prop("${selectedItem.prop.name}") * 2`} onInsert={insertAtCursor} />
                              <ExampleBlock code={`if(prop("${selectedItem.prop.name}") > 100, "High", "Low")`} onInsert={insertAtCursor} />
                            </>
                          )}
                          {selectedItem.prop.type === 'text' && (
                            <>
                              <ExampleBlock code={`length(prop("${selectedItem.prop.name}"))`} onInsert={insertAtCursor} />
                              <ExampleBlock code={`contains(prop("${selectedItem.prop.name}"), "keyword")`} onInsert={insertAtCursor} />
                            </>
                          )}
                          {(selectedItem.prop.type === 'date' || selectedItem.prop.type === 'due_date') && (
                            <>
                              <ExampleBlock code={`dateBetween(now(), prop("${selectedItem.prop.name}"), "days")`} onInsert={insertAtCursor} />
                              <ExampleBlock code={`formatDate(prop("${selectedItem.prop.name}"), "MMM DD, YYYY")`} onInsert={insertAtCursor} />
                            </>
                          )}
                          {selectedItem.prop.type === 'checkbox' && (
                            <ExampleBlock code={`if(prop("${selectedItem.prop.name}"), "✅", "❌")`} onInsert={insertAtCursor} />
                          )}
                          {(selectedItem.prop.type === 'select' || selectedItem.prop.type === 'status') && (
                            <ExampleBlock code={`if(prop("${selectedItem.prop.name}") == "Done", "✅", "🔄")`} onInsert={insertAtCursor} />
                          )}
                          {/* Generic example */}
                          <ExampleBlock code={`prop("${selectedItem.prop.name}")`} onInsert={insertAtCursor} />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Function documentation */}
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center text-[11px] font-bold text-accent-text-light bg-accent-muted rounded shrink-0 font-mono">ƒ</span>
                      <span className="text-sm font-semibold text-ink-strong truncate">{selectedItem.fn.name}</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[11px] font-semibold text-ink-muted uppercase">Description</span>
                        <p className="text-xs text-ink-body-light mt-0.5 leading-relaxed">{selectedItem.fn.description}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-ink-muted uppercase">Signature</span>
                        <div className="mt-1 p-2 rounded-md bg-surface-primary border border-line font-mono text-xs text-ink-body">
                          {selectedItem.fn.signature}
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-ink-muted uppercase">Returns</span>
                        <div className="mt-0.5">{getReturnTypeBadge(selectedItem.fn.returnType)}</div>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-ink-muted uppercase">Examples</span>
                        <div className="mt-1 space-y-1.5">
                          {selectedItem.fn.examples.map((ex, i) => (
                            <ExampleBlock key={i} code={ex} onInsert={insertAtCursor} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-ink-muted uppercase">Category</span>
                        <p className="text-xs text-ink-secondary mt-0.5">{selectedItem.fn.category}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <HelpCircle className="w-8 h-8 text-ink-faint mb-2" />
                <p className="text-xs text-ink-muted leading-relaxed">
                  Hover over a property or function to see its documentation and usage examples.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── EXAMPLE CODE BLOCK ──────────────────────────────────────────────────────

interface ExampleBlockProps {
  key?: React.Key;
  code: string;
  onInsert: (text: string) => void;
}

function ExampleBlock({ code, onInsert }: ExampleBlockProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-start gap-1 group">
      <div className="flex-1 p-1.5 rounded bg-surface-primary border border-line font-mono text-[11px] text-ink-body break-all leading-snug">
        {code}
      </div>
      <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onInsert(code)}
          className="p-1 rounded hover:bg-hover-accent-soft text-ink-muted hover:text-hover-accent-text transition-colors"
          title="Insert into formula"
        >
          <ArrowUpRight className="w-3 h-3" />
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="p-1 rounded hover:bg-hover-surface2 text-ink-muted hover:text-hover-text transition-colors"
          title="Copy"
        >
          {copied ? (
            <CheckSquare className="w-3 h-3 text-success-text" />
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
