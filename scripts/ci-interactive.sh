#!/bin/bash

# Interactive CI Monitor Script
# Allows you to trigger CI and view any of the last 5 runs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
WORKFLOW="ci.yml"
BRANCH="${1:-local-playground-app}"
MAX_RUNS=5

# Get repository info from git
REPO_URL=$(git config --get remote.origin.url 2>/dev/null || echo "")
REPO_OWNER=$(echo "$REPO_URL" | sed 's/.*:\|.*\/\///' | sed 's/\/.*//')
REPO_NAME=$(echo "$REPO_URL" | sed 's/.*\///' | sed 's/\.git//')
GITHUB_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}"

clear

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         🚀 Interactive CI Runner & Monitor                     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${PURPLE}Repository: ${CYAN}${GITHUB_URL}${NC}"
echo -e "${PURPLE}Branch: ${CYAN}${BRANCH}${NC}"
echo ""

# Function to display menu
show_menu() {
    echo -e "${YELLOW}What would you like to do?${NC}"
    echo ""
    echo -e "${BLUE}1)${NC} Trigger a new CI run"
    echo -e "${BLUE}2)${NC} View logs from recent runs"
    echo -e "${BLUE}3)${NC} Exit"
    echo ""
}

# Function to trigger CI
trigger_ci() {
    echo -e "${YELLOW}🚀 Triggering CI workflow on branch: ${BRANCH}${NC}"
    echo ""
    
    if gh workflow run "$WORKFLOW" --ref "$BRANCH" 2>/dev/null; then
        echo -e "${GREEN}✅ CI workflow triggered successfully!${NC}"
        echo ""
        sleep 2
        
        # Get the new run ID
        NEW_RUN=$(gh run list --workflow "$WORKFLOW" --limit 1 --json databaseId -q '.[0].databaseId')
        RUN_URL="${GITHUB_URL}/actions/runs/${NEW_RUN}"
        
        echo -e "${GREEN}New run ID: ${BLUE}${NEW_RUN}${NC}"
        echo -e "${PURPLE}View on GitHub: ${CYAN}${RUN_URL}${NC}"
        echo ""
        
        echo -e "${YELLOW}Would you like to watch this run in real-time?${NC}"
        echo -e "${BLUE}1)${NC} Yes, watch it"
        echo -e "${BLUE}2)${NC} No, go back to menu"
        read -p "Choose (1-2): " watch_choice
        
        if [ "$watch_choice" = "1" ]; then
            echo -e "${CYAN}⏱️  Watching run... (Press Ctrl+C to stop)${NC}"
            gh run watch "$NEW_RUN" || true
        fi
    else
        echo -e "${RED}❌ Failed to trigger CI workflow${NC}"
    fi
}

# Function to view recent runs
view_recent_runs() {
    echo -e "${YELLOW}📊 Fetching last ${MAX_RUNS} CI runs...${NC}"
    echo ""
    
    # Get runs and format them nicely
    RUNS=$(gh run list --workflow "$WORKFLOW" --limit $MAX_RUNS --json databaseId,conclusion,status,createdAt,updatedAt)
    
    if [ -z "$RUNS" ] || [ "$RUNS" = "[]" ]; then
        echo -e "${RED}No runs found${NC}"
        return
    fi
    
    # Parse and display runs
    echo -e "${BLUE}Last ${MAX_RUNS} Runs:${NC}"
    echo ""
    
    RUN_COUNT=0
    echo "$RUNS" | jq -r '.[] | @base64' | while read -r RUN_B64; do
        RUN=$(echo "$RUN_B64" | base64 -d)
        RUN_ID=$(echo "$RUN" | jq -r '.databaseId')
        STATUS=$(echo "$RUN" | jq -r '.status')
        CONCLUSION=$(echo "$RUN" | jq -r '.conclusion // "pending"')
        CREATED=$(echo "$RUN" | jq -r '.createdAt')
        
        # Format status
        if [ "$STATUS" = "completed" ]; then
            if [ "$CONCLUSION" = "success" ]; then
                STATUS_ICON="✅ Success"
                STATUS_COLOR="${GREEN}"
            else
                STATUS_ICON="❌ Failed"
                STATUS_COLOR="${RED}"
            fi
        else
            STATUS_ICON="⏳ Running"
            STATUS_COLOR="${YELLOW}"
        fi
        
        # Format date
        DATE=$(echo "$CREATED" | cut -d'T' -f1)
        TIME=$(echo "$CREATED" | cut -d'T' -f2 | cut -d'.' -f1)
        
        # Build run URL
        RUN_URL="${GITHUB_URL}/actions/runs/${RUN_ID}"
        
        RUN_COUNT=$((RUN_COUNT + 1))
        echo -e "${BLUE}${RUN_COUNT})${NC} ${STATUS_COLOR}${STATUS_ICON}${NC} | ${CYAN}${RUN_ID}${NC} | ${DATE} ${TIME}"
        echo -e "   🔗 ${CYAN}${RUN_URL}${NC}"
        echo ""
    done
    
    echo -e "${YELLOW}Which run would you like to view?${NC}"
    read -p "Enter number (or press Enter to go back): " run_choice
    
    if [ -z "$run_choice" ]; then
        return
    fi
    
    # Get the selected run ID
    SELECTED_RUN=$(echo "$RUNS" | jq -r ".[$((run_choice - 1))].databaseId" 2>/dev/null)
    
    if [ -z "$SELECTED_RUN" ] || [ "$SELECTED_RUN" = "null" ]; then
        echo -e "${RED}Invalid selection${NC}"
        return
    fi
    
    # Show options for the selected run
    show_run_options "$SELECTED_RUN"
}

# Function to show options for a specific run
show_run_options() {
    LOCAL_RUN_ID=$1
    RUN_URL="${GITHUB_URL}/actions/runs/${LOCAL_RUN_ID}"
    
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Selected Run: ${CYAN}${LOCAL_RUN_ID}${NC}"
    echo -e "${PURPLE}GitHub URL: ${CYAN}${RUN_URL}${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    echo -e "${YELLOW}What would you like to do?${NC}"
    echo ""
    echo -e "${BLUE}1)${NC} View run summary"
    echo -e "${BLUE}2)${NC} View full logs"
    echo -e "${BLUE}3)${NC} View failed logs only"
    echo -e "${BLUE}4)${NC} Watch in real-time"
    echo -e "${BLUE}5)${NC} Open in browser"
    echo -e "${BLUE}6)${NC} Copy GitHub URL to clipboard"
    echo -e "${BLUE}7)${NC} Back to run list"
    echo ""
    
    read -p "Choose (1-7): " run_action
    
    case $run_action in
        1)
            echo ""
            echo -e "${CYAN}📋 Run Summary:${NC}"
            echo ""
            gh run view "$LOCAL_RUN_ID"
            ;;
        2)
            echo ""
            echo -e "${CYAN}📄 Full Logs (showing last 100 lines):${NC}"
            echo ""
            gh run view "$LOCAL_RUN_ID" --log | tail -100
            ;;
        3)
            echo ""
            echo -e "${CYAN}❌ Failed Logs Only:${NC}"
            echo ""
            gh run view "$LOCAL_RUN_ID" --log-failed
            ;;
        4)
            echo ""
            echo -e "${CYAN}⏱️  Watching run... (Press Ctrl+C to stop)${NC}"
            gh run watch "$LOCAL_RUN_ID" || true
            ;;
        5)
            echo ""
            echo -e "${CYAN}🌐 Opening in browser...${NC}"
            gh run view "$LOCAL_RUN_ID" --web
            echo -e "${GREEN}✅ Opened in browser${NC}"
            ;;
        6)
            echo ""
            echo -e "${CYAN}📋 Copying to clipboard...${NC}"
            echo -n "$RUN_URL" | pbcopy 2>/dev/null || echo -n "$RUN_URL" | xclip -selection clipboard 2>/dev/null || true
            echo -e "${GREEN}✅ URL copied: ${CYAN}${RUN_URL}${NC}"
            ;;
        7)
            return
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..." dummy
}

# Main loop
while true; do
    show_menu
    read -p "Choose (1-3): " choice
    
    case $choice in
        1)
            clear
            trigger_ci
            ;;
        2)
            clear
            view_recent_runs
            ;;
        3)
            echo ""
            echo -e "${GREEN}Goodbye! 👋${NC}"
            exit 0
            ;;
        *)
            clear
            echo -e "${RED}Invalid choice. Please try again.${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..." dummy
    clear
done
