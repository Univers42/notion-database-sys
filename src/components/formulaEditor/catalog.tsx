/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   catalog.tsx                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:29 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:36:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { cn } from '../../utils/cn';

// ═══════════════════════════════════════════════════════════════════════════════
// FORMULA FUNCTION CATALOG — static data for the formula editor
// ═══════════════════════════════════════════════════════════════════════════════

export interface FunctionDef {
  name: string;
  category: string;
  signature: string;
  description: string;
  returnType: string;
  examples: string[];
}

export const FORMULA_FUNCTIONS: FunctionDef[] = [
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

export const FUNCTION_CATEGORIES = ['Built-ins', 'General', 'Text', 'Number', 'Date', 'People', 'List', 'Special'];

// ─── RETURN TYPE BADGE COLORS ────────────────────────────────────────────────

const RETURN_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  'Number': { bg: 'bg-accent-muted', text: 'text-accent-text' },
  'Text': { bg: 'bg-success-surface-muted', text: 'text-success-text-bold' },
  'Boolean': { bg: 'bg-amber-surface-muted', text: 'text-amber-text-bold' },
  'Date': { bg: 'bg-purple-surface-muted', text: 'text-purple-text-bold' },
  'DateRange': { bg: 'bg-purple-surface-muted', text: 'text-purple-text-bold' },
  'List': { bg: 'bg-cyan-surface-muted', text: 'text-cyan-text-bold' },
  'Any': { bg: 'bg-surface-tertiary', text: 'text-ink-body-light' },
  'Person': { bg: 'bg-pink-surface-muted', text: 'text-pink-text-bold' },
};

export function getReturnTypeBadge(returnType: string) {
  const colors = RETURN_TYPE_COLORS[returnType] || RETURN_TYPE_COLORS['Any'];
  return (
    <span className={cn(`ml-2 shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors.bg} ${colors.text}`)}>
      {returnType}
    </span>
  );
}

export function propReturnType(type: string): string {
  switch (type) {
    case 'number': return 'Number';
    case 'checkbox': return 'Boolean';
    case 'date': case 'due_date': case 'created_time': case 'last_edited_time': return 'Date';
    case 'person': case 'user': case 'assigned_to': case 'created_by': case 'last_edited_by': return 'Person';
    case 'multi_select': case 'relation': return 'List';
    default: return 'Text';
  }
}
