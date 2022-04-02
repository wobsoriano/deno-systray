package main

import (
	"bufio"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/signal"
	"reflect"
	"strings"
	"syscall"

	"github.com/getlantern/systray"
)

func main() {
	// Should be called at the very beginning of main().
	systray.Run(onReady, onExit)
}

func onExit() {
	os.Exit(0)
}

// Item represents an item in the menu
type Item struct {
	Title   string `json:"title"`
	Tooltip string `json:"tooltip"`
	Enabled bool   `json:"enabled"`
	Checked bool   `json:"checked"`
}

// Menu has an icon, title and list of items
type Menu struct {
	Icon    string `json:"icon"`
	Title   string `json:"title"`
	Tooltip string `json:"tooltip"`
	Items   []Item `json:"items"`
}

// Action for an item?..
type Action struct {
	Type  string `json:"type"`
	Item  Item   `json:"item"`
	Menu  Menu   `json:"menu"`
	SeqID int    `json:"seq_id"`
}

func readLine(reader *bufio.Reader) io.Reader {
	input, err := reader.ReadString('\n')
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
	}
	if len(input) < 1 {
		return strings.NewReader("")
	}
	return strings.NewReader(input[0 : len(input)-1])
}

func readAction(reader *bufio.Reader) Action {
	var action Action
	if err := json.NewDecoder(readLine(reader)).Decode(&action); err != nil {
		fmt.Fprintln(os.Stderr, err)
	}
	return action
}

func onReady() {
	signalChannel := make(chan os.Signal, 2)
	signal.Notify(signalChannel, os.Interrupt, syscall.SIGTERM)
	go func() {
		for sig := range signalChannel {
			switch sig {
			case os.Interrupt, syscall.SIGTERM:
				//handle SIGINT, SIGTERM
				fmt.Println("Quit")
				systray.Quit()
			default:
				fmt.Println("Unhandled signal:", sig)
			}
		}
	}()

	// We can manipulate the systray in other goroutines
	go func() {
		items := make([]*systray.MenuItem, 0)
		// fmt.Println(items)
		fmt.Println(`{"type": "ready"}`)
		reader := bufio.NewReader(os.Stdin)
		// println(readLine(reader))
		var menu Menu
		err := json.NewDecoder(readLine(reader)).Decode(&menu)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
		}
		// fmt.Println("menu", menu)
		icon, err := base64.StdEncoding.DecodeString(menu.Icon)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
		}
		systray.SetIcon(icon)
		systray.SetTitle(menu.Title)
		systray.SetTooltip(menu.Tooltip)

		updateItem := func(action Action) {
			item := action.Item
			menuItem := items[action.SeqID]
			menu.Items[action.SeqID] = item
			if item.Checked {
				menuItem.Check()
			} else {
				menuItem.Uncheck()
			}
			if item.Enabled {
				menuItem.Enable()
			} else {
				menuItem.Disable()
			}
			menuItem.SetTitle(item.Title)
			menuItem.SetTooltip(item.Tooltip)
			// fmt.Println("Done")
			// fmt.Printf("Read from channel %#v and received %s\n", items[chosen], value.String())
		}
		updateMenu := func(action Action) {
			m := action.Menu
			if menu.Title != m.Title {
				menu.Title = m.Title
				systray.SetTitle(menu.Title)
			}
			if menu.Icon != m.Icon {
				menu.Icon = m.Icon
				icon, err := base64.StdEncoding.DecodeString(menu.Icon)
				if err != nil {
					fmt.Fprintln(os.Stderr, err)
				}
				systray.SetIcon(icon)
			}
			if menu.Tooltip != m.Tooltip {
				menu.Tooltip = m.Tooltip
				systray.SetTooltip(menu.Tooltip)
			}
		}

		update := func(action Action) {
			switch action.Type {
			case "update-item":
				updateItem(action)
			case "update-menu":
				updateMenu(action)
			case "update-item-and-menu":
				updateItem(action)
				updateMenu(action)
			}
		}

		go func(reader *bufio.Reader) {
			for {
				action := readAction(reader)
				update(action)
			}
		}(reader)

		for i := 0; i < len(menu.Items); i++ {
			item := menu.Items[i]
			menuItem := systray.AddMenuItem(item.Title, item.Tooltip)
			if item.Checked {
				menuItem.Check()
			} else {
				menuItem.Uncheck()
			}
			if item.Enabled {
				menuItem.Enable()
			} else {
				menuItem.Disable()
			}
			items = append(items, menuItem)
		}
		stdoutEnc := json.NewEncoder(os.Stdout)
		// {"type": "update-item", "item": {"Title":"aa3","Tooltip":"bb","Enabled":true,"Checked":true}, "seqID": 0}
		for {
			cases := make([]reflect.SelectCase, len(items))
			for i, ch := range items {
				cases[i] = reflect.SelectCase{Dir: reflect.SelectRecv, Chan: reflect.ValueOf(ch.ClickedCh)}
			}

			remaining := len(cases)
			for remaining > 0 {
				chosen, _, ok := reflect.Select(cases)
				if !ok {
					// The chosen channel has been closed, so zero out the channel to disable the case
					cases[chosen].Chan = reflect.ValueOf(nil)
					remaining--
					continue
				}
				// menuItem := items[chosen]
				err := stdoutEnc.Encode(Action{
					Type:  "clicked",
					Item:  menu.Items[chosen],
					SeqID: chosen,
				})
				if err != nil {
					fmt.Fprintln(os.Stderr, err)
				}
			}
		}
	}()
}