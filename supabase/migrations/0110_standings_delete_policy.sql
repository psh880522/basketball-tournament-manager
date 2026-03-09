CREATE POLICY standings_delete_organizer
ON standings
FOR DELETE
TO authenticated
USING (is_organizer());
