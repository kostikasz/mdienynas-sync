import { describe, it, expect } from "vitest"
import { parseGrades, parseHomework } from "../src/lib/parser"

const GRADES_HTML = `<!DOCTYPE html><html><body><table>
  <tr>
    <td class="mark_subject" data-group-id="42" title="Mathematics (-) teacher">
      <a>Mr. Smith</a>
    </td>
  </tr>
  <tr>
    <td id="td-2026-03-28-42" class="td-class-mark">
      <span class="span-mark-value">9</span>
      <span class="span-mark-info">Test result</span>
    </td>
  </tr>
</table></body></html>`

const MULTI_GRADE_HTML = `<!DOCTYPE html><html><body><table>
  <tr>
    <td class="mark_subject" data-group-id="5" title="Physics (-) type">
      <a>Dr. Jones</a>
    </td>
  </tr>
  <tr>
    <td id="td-2026-03-10-5" class="td-class-mark">
      <span class="span-mark-value">7</span>
      <span class="span-mark-value">8</span>
      <span class="span-mark-info">Pair entry</span>
    </td>
  </tr>
</table></body></html>`

const HOMEWORK_HTML = `<!DOCTYPE html><html><body><table>
  <tr class="simple_info_block">
    <td>2026-03-28</td>
    <td class="mark_subject" data-lesson-id="123">Mathematics</td>
    <td>Mr. Smith</td>
    <td class="chDescription">Solve problems 1-5</td>
    <td>2026-03-30 00:00:00</td>
    <td>2026-03-27</td>
  </tr>
</table></body></html>`

describe("parseGrades", () => {
  it("extracts subject, teacher, grade, content, lesson_id and due_date", () => {
    const entries = parseGrades(GRADES_HTML)
    expect(entries).toHaveLength(1)
    expect(entries[0].subject).toBe("Mathematics")
    expect(entries[0].teacher).toBe("Mr. Smith")
    expect(entries[0].grade).toBe("9")
    expect(entries[0].content).toBe("Test result")
    expect(entries[0].lesson_id).toBe("42-2026-03-28")
    expect(entries[0].due_date).toBe("2026-03-28T00:00:00.000Z")
    expect(entries[0].type).toBe("Grade")
  })

  it("strips trailing (-) word from subject title", () => {
    const entries = parseGrades(GRADES_HTML)
    expect(entries[0].subject).toBe("Mathematics")
  })

  it("produces two entries with suffixes when a cell has two grade spans", () => {
    const entries = parseGrades(MULTI_GRADE_HTML)
    expect(entries).toHaveLength(2)
    expect(entries[0].lesson_id).toBe("5-2026-03-10-0")
    expect(entries[1].lesson_id).toBe("5-2026-03-10-1")
    expect(entries[0].grade).toBe("7")
    expect(entries[1].grade).toBe("8")
    expect(entries[0].content).toBe("Pair entry")
    expect(entries[1].content).toBe("")
  })

  it("returns empty array for HTML with no grade cells", () => {
    expect(parseGrades("<html><body></body></html>")).toEqual([])
  })
})

describe("parseHomework", () => {
  it("extracts subject, teacher, description, lesson_id, and dates", () => {
    const entries = parseHomework(HOMEWORK_HTML)
    expect(entries).toHaveLength(1)
    expect(entries[0].subject).toBe("Mathematics")
    expect(entries[0].teacher).toBe("Mr. Smith")
    expect(entries[0].description).toBe("Solve problems 1-5")
    expect(entries[0].lesson_id).toBe("123")
    expect(entries[0].due_date).toBe("2026-03-30T00:00:00.000Z")
    expect(entries[0].assigned_date).toBe("2026-03-27T00:00:00.000Z")
  })

  it("returns empty array for HTML with no homework rows", () => {
    expect(parseHomework("<html><body></body></html>")).toEqual([])
  })

  it("skips rows with fewer than 6 columns", () => {
    const html = `<html><body><table>
      <tr class="simple_info_block"><td>a</td><td>b</td></tr>
    </table></body></html>`
    expect(parseHomework(html)).toEqual([])
  })
})
