# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    merge_to_develop_and_push.sh                       :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/05/18 21:19:17 by dlesieur          #+#    #+#              #
#    Updated: 2026/05/18 21:19:17 by dlesieur         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

#!/bin/bash

set -e

# If the current branch is not develop, switch to develop first
current_branch=$(git branch --show-current)

if [ "$current_branch" != "develop" ]; then
  echo "First, switch to the develop branch"
  exit 0
fi

if [ -z "$1" ]; then
  echo "Usage: $0 <branch-name>"
  exit 1
fi

git push --delete origin "$1"; git merge "$1"; git branch -D "$1"; git push
