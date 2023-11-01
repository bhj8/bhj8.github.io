package main

import (
	"bufio"
	"encoding/xml"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"

	"github.com/tealeg/xlsx"
)

type Config struct {
	OutPath  OutPath    `xml:"outpath"`
	Python   Python     `xml:"python"`
	TableMap []TableMap `xml:"tablemap"`
}

type OutPath struct {
	Value string `xml:"value,attr"`
}

type Python struct {
	File string `xml:"file,attr"`
}

type TableMap struct {
	Name      string  `xml:"name,attr"`
	CSVFolder string  `xml:"csvfolder,attr"`
	Sheets    []Sheet `xml:"sheet"`
}

type Sheet struct {
	Src  string `xml:"src,attr"`
	Dest string `xml:"dest,attr"`
}

func getDesiredPath(relativePath string) (string, error) {
	// 从当前目录开始，将相对路径转换为绝对路径
	return filepath.Abs(relativePath)
}

func readConfig(filename string) (Config, error) {
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		return Config{}, err
	}

	var config Config
	err = xml.Unmarshal(data, &config)
	return config, err
}

func processSingleXLSXFile(basePath string, tablemap TableMap, outPath string) error {
	xlsxFile, err := xlsx.OpenFile(path.Join(basePath, tablemap.Name+".xlsx"))
	if err != nil {
		return err
	}

	csvFolderPath := path.Join(outPath, tablemap.CSVFolder)
	os.MkdirAll(csvFolderPath, os.ModePerm)

	for _, sheet := range tablemap.Sheets {
		xlsxSheet, ok := xlsxFile.Sheet[sheet.Src]
		if !ok {
			return fmt.Errorf("sheet %s not found in %s", sheet.Src, tablemap.Name)
		}

		csvFile, err := os.Create(path.Join(csvFolderPath, sheet.Dest+".csv"))
		if err != nil {
			return err
		}
		defer csvFile.Close()

		var validColumns []int
		if len(xlsxSheet.Rows) > 0 {
			for idx, cell := range xlsxSheet.Rows[0].Cells {
				if cell.String() != "" {
					validColumns = append(validColumns, idx)
				}
			}
		}

		for rowNum, row := range xlsxSheet.Rows {
			// Skip the 3rd and 5th rows
			if rowNum == 2 || rowNum == 4 {
				continue
			}

			// Skip rows where the first cell is empty
			if len(row.Cells) == 0 || row.Cells[0].String() == "" {
				continue
			}

			var record []string
			for _, colNum := range validColumns {
				if colNum < len(row.Cells) {
					record = append(record, row.Cells[colNum].String())
				} else {
					record = append(record, "") // or any default value you want
				}
			}
			combinedString := strings.Join(record, "|")
			csvFile.WriteString(combinedString + "\n")
		}

		fmt.Printf("Created %s\n", csvFile.Name())
	}
	return nil
}

func processXLSXFilesConcurrently(basePath string, config Config) error {
	var wg sync.WaitGroup
	errorsCh := make(chan error, len(config.TableMap))

	for _, tablemap := range config.TableMap {
		wg.Add(1)
		go func(tablemap TableMap) {
			defer wg.Done()
			if err := processSingleXLSXFile(basePath, tablemap, config.OutPath.Value); err != nil {
				errorsCh <- err
			}
		}(tablemap)
	}

	// Wait for all goroutines to finish
	wg.Wait()
	close(errorsCh)

	// Collect errors if any
	var errors []error
	for err := range errorsCh {
		errors = append(errors, err)
	}
	if len(errors) > 0 {
		return fmt.Errorf("encountered multiple errors: %v", errors)
	}
	return nil
}

func deleteCSVFiles(dirPath string) error {
	files, err := ioutil.ReadDir(dirPath)
	if err != nil {
		return fmt.Errorf("failed to read directory %s: %v", dirPath, err)
	}

	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".csv") {
			err := os.Remove(path.Join(dirPath, file.Name()))
			if err != nil {
				return nil
			}
		}
	}

	return nil
}

func main() {
	config, err := readConfig("config.xml")
	if err != nil {
		log.Fatalf("Error reading XML: %v", err)
	}

	err = deleteCSVFiles(config.OutPath.Value)
	if err != nil {
		log.Fatalf("Error deleting CSV files: %v", err)
	}

	err = processXLSXFilesConcurrently(".", config) // <-- use the concurrent function
	if err != nil {
		log.Fatalf("Error processing XLSX files: %v", err)
	}

	fmt.Println("导表成功！不亏是我写的！速度真快的飞起！")
	bufio.NewReader(os.Stdin).ReadBytes('\n')
}
