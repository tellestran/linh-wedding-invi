CREATE TABLE `rsvps` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `attendance` text NOT NULL CHECK (`attendance` IN ('both', 'party', 'ceremony', 'no')),
  `guests` integer NOT NULL CHECK ((`attendance` = 'no' AND `guests` = 0) OR (`attendance` != 'no' AND `guests` BETWEEN 1 AND 5)),
  `note` text NOT NULL,
  `created_at` text NOT NULL
);
