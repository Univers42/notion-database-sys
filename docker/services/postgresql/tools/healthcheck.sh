# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    healthcheck.sh                                     :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/05/18 21:19:17 by dlesieur          #+#    #+#              #
#    Updated: 2026/05/18 21:19:17 by dlesieur         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

#!/bin/sh
set -e
pg_isready -U "${POSTGRES_USER:-notion_user}" -d "${POSTGRES_DB:-notion_db}" -q
